{-# LANGUAGE DeriveGeneric #-}
{-# LANGUAGE OverloadedStrings #-}

module Main where

import Control.Concurrent.MVar (MVar, modifyMVar, modifyMVar_, newMVar, readMVar)
import Data.Aeson (FromJSON, ToJSON, eitherDecode, encode)
import qualified Data.ByteString.Lazy as LBS
import Data.Map (Map)
import qualified Data.Map as Map
import Data.Text (Text)
import qualified Data.Text as T
import GHC.Generics (Generic)
import Network.HTTP.Types (status200, status400, status404)
import Network.Wai (Application, requestBody, requestMethod, pathInfo, responseLBS)
import Network.Wai.Handler.Warp (run)
import Network.Wai.Middleware.Cors (cors, simpleCorsResourcePolicy)
import System.IO (hPutStrLn, stderr)
import Telephony.Billing (billableDuration)
import Telephony.Routing (endCall, initiateNameCall, registerPhone)
import Telephony.SmsSignature (requireSmsSignature)
import Telephony.StellarAddress (normalizeDialInput, resolveDialTarget)
import Telephony.Storage (quoteCommsBundle)
import Telephony.Tolls (validateGift, validateSmsToll)
import Telephony.Types

data Store = Store
  { phoneLines :: !(Map String PhoneLine)
  , stellarProfiles :: !(Map String StellarProfile)
  , activeCalls :: !(Map String CallSession)
  , smsInbox :: !(Map String [SmsMessage])
  , calendar :: !(Map String [CalendarEvent])
  , recordings :: !(Map String CallRecording)
  , msgCounter :: !Int
  }

emptyStore :: Store
emptyStore = Store Map.empty Map.empty Map.empty Map.empty Map.empty Map.empty 0

main :: IO ()
main = do
  store <- newMVar emptyStore
  let port = 4010
  hPutStrLn stderr $ "Payphone Telephony Engine on port " ++ show port
  run port (cors (const $ Just simpleCorsResourcePolicy) $ app store)

app :: MVar Store -> Application
app store req respond = do
  body <- requestBody req
  case (requestMethod req, pathInfo req) of
    ("GET", ["health"]) ->
      respond $ responseLBS status200 [("Content-Type", "application/json")]
        "{\"ok\":true,\"service\":\"payphone-telephony-engine\"}"
    ("POST", ["v1", "phones", "register"]) -> handleRegister store body respond
    ("GET", ["v1", "phones", name]) -> handleGetPhone store (T.unpack name) respond
    ("POST", ["v1", "stellar", "register"]) -> handleRegisterStellar store body respond
    ("GET", ["v1", "stellar", name]) -> handleResolveStellar store (T.unpack name) respond
    ("POST", ["v1", "calls", "name"]) -> handleNameCall store body respond
    ("POST", ["v1", "calls", sid, "end"]) -> handleEndCall store (T.unpack sid) body respond
    ("POST", ["v1", "sms", "send"]) -> handleSendSms store body respond
    ("GET", ["v1", "sms", name]) -> handleGetSms store (T.unpack name) respond
    ("POST", ["v1", "calendar"]) -> handleCreateEvent store body respond
    ("GET", ["v1", "calendar", name]) -> handleGetCalendar store (T.unpack name) respond
    ("POST", ["v1", "pay", "quote"]) -> handlePayQuote body respond
    ("POST", ["v1", "recordings", "register"]) -> handleRegisterRecording store body respond
    ("GET", ["v1", "recordings", name]) -> handleListRecordings store (T.unpack name) respond
    _ -> respond $ responseLBS status404 [] "Not found"

handleRegister :: MVar Store -> LBS.ByteString -> (LBS.ByteString -> IO ()) -> IO ()
handleRegister store body respond = case eitherDecode body of
  Left err -> respondErr respond err
  Right (p :: RegisterPhonePayload) -> do
    s <- readMVar store
    case registerPhone (phoneLines s) p of
      Left e -> respondErr respond (T.unpack e)
      Right line -> do
        modifyMVar_ store $ \st ->
          return st { phoneLines = Map.insert (stellarName line) line (phoneLines st) }
        respondOk respond line

handleRegisterStellar :: MVar Store -> LBS.ByteString -> (LBS.ByteString -> IO ()) -> IO ()
handleRegisterStellar store body respond = case eitherDecode body of
  Left err -> respondErr respond err
  Right (prof :: StellarProfile) -> do
    modifyMVar_ store $ \st ->
      return st { stellarProfiles = Map.insert (stellarName prof) prof (stellarProfiles st) }
    respondOk respond prof

handleResolveStellar :: MVar Store -> String -> (LBS.ByteString -> IO ()) -> IO ()
handleResolveStellar store name respond = do
  s <- readMVar store
  case Map.lookup name (stellarProfiles s) of
    Just prof -> respondOk respond prof
    Nothing ->
      let reachable = Map.member name (phoneLines s)
          prof = StellarProfile
            { stellarName = name
            , publicKey = ""
            , dialAddress = resolveDialTarget name Nothing
            , reachable = reachable
            }
      in respondOk respond prof

handleGetPhone :: MVar Store -> String -> (LBS.ByteString -> IO ()) -> IO ()
handleGetPhone store name respond = do
  s <- readMVar store
  case Map.lookup name (phoneLines s) of
    Nothing -> respondErr respond "Phone line not registered"
    Just line -> respondOk respond line

handleNameCall :: MVar Store -> LBS.ByteString -> (LBS.ByteString -> IO ()) -> IO ()
handleNameCall store body respond = case eitherDecode body of
  Left err -> respondErr respond err
  Right (p :: NameCallPayload) -> do
    let target = normalizeDialInput (toName p)
        payload = p { toName = target }
    s <- readMVar store
    case initiateNameCall (phoneLines s) payload of
      Left e -> respondErr respond (T.unpack e)
      Right session -> do
        modifyMVar_ store $ \st ->
          return st { activeCalls = Map.insert (sessionId session) session (activeCalls st) }
        respondOk respond session

data EndCallResult = EndCallResult
  { session :: !CallSession
  , billableSeconds :: !Int
  } deriving (Generic)

instance ToJSON EndCallResult

handleEndCall :: MVar Store -> String -> LBS.ByteString -> (LBS.ByteString -> IO ()) -> IO ()
handleEndCall store sid body respond = case eitherDecode body of
  Left err -> respondErr respond err
  Right (p :: EndCallPayload) -> do
    result <- modifyMVar store $ \st ->
      case Map.lookup sid (activeCalls st) of
        Nothing -> return (st, Left "Call session not found")
        Just session ->
          let ended = endCall session p
              billable = billableDuration (minBillableSeconds ended) (durationSeconds p)
              st' = st { activeCalls = Map.delete sid (activeCalls st) }
          in return (st', Right EndCallResult { session = ended, billableSeconds = billable })
    case result of
      Left e -> respondErr respond e
      Right r -> respondOk respond r

handleSendSms :: MVar Store -> LBS.ByteString -> (LBS.ByteString -> IO ()) -> IO ()
handleSendSms store body respond = case eitherDecode body of
  Left err -> respondErr respond err
  Right (p :: SendSmsPayload) -> do
    case requireSmsSignature (digitalSignature p) of
      Left e -> respondErr respond (T.unpack e)
      Right _ -> do
        result <- modifyMVar store $ \st ->
          let target = normalizeDialInput (toName p)
          in case Map.lookup target (phoneLines st) of
            Nothing -> return (st, Left "Recipient has not connected a phone line")
            Just toLine ->
              case validateSmsToll toLine (smsTollUsdc toLine) of
                Left e -> return (st, Left (T.unpack e))
                Right _ ->
                  case validateGift (giftUsdc p) of
                    Left e -> return (st, Left (T.unpack e))
                    Right _ ->
                      let n = msgCounter st + 1
                          msg = SmsMessage
                            { id = "sms-" ++ show n
                            , fromName = fromName p
                            , toName = target
                            , body = body p
                            , sentAt = fromIntegral n
                            , giftUsdc = giftUsdc p
                            , stellarPublicKey = stellarPublicKey p
                            , digitalSignature = digitalSignature p
                            }
                          inbox = Map.findWithDefault [] target (smsInbox st)
                          st' = st
                            { smsInbox = Map.insert target (msg : inbox) (smsInbox st)
                            , msgCounter = n
                            }
                      in return (st', Right msg)
        case result of
          Left e -> respondErr respond e
          Right msg -> respondOk respond msg

handleGetSms :: MVar Store -> String -> (LBS.ByteString -> IO ()) -> IO ()
handleGetSms store name respond = do
  s <- readMVar store
  respondOk respond (Map.findWithDefault [] name (smsInbox s))

handlePayQuote :: LBS.ByteString -> (LBS.ByteString -> IO ()) -> IO ()
handlePayQuote body respond = case eitherDecode body of
  Left err -> respondErr respond err
  Right (p :: PayQuoteRequest) ->
    let total = quoteCommsBundle (storageGibMonths p) (transferMib p)
    in respondOk respond PayQuote
      { storageGibMonths = storageGibMonths p
      , transferMib = transferMib p
      , totalUsdc = total
      , filecoinRate = 0.50
      , transferRate = 0.02
      , reason = reason p
      }

handleRegisterRecording :: MVar Store -> LBS.ByteString -> (LBS.ByteString -> IO ()) -> IO ()
handleRegisterRecording store body respond = case eitherDecode body of
  Left err -> respondErr respond err
  Right (p :: RegisterRecordingPayload) -> do
    let rid = "rec-" ++ sessionId p
        rec = CallRecording
          { recordingId = rid
          , sessionId = sessionId p
          , ownerName = ownerName p
          , localPath = localPath p
          , sharedToken = "share-" ++ rid
          , createdAt = 0
          }
    modifyMVar_ store $ \st ->
      return st { recordings = Map.insert rid rec (recordings st) }
    respondOk respond rec

handleListRecordings :: MVar Store -> String -> (LBS.ByteString -> IO ()) -> IO ()
handleListRecordings store name respond = do
  s <- readMVar store
  let owned = filter ((== name) . ownerName) (Map.elems (recordings s))
  respondOk respond owned

handleCreateEvent :: MVar Store -> LBS.ByteString -> (LBS.ByteString -> IO ()) -> IO ()
handleCreateEvent store body respond = case eitherDecode body of
  Left err -> respondErr respond err
  Right (p :: CreateEventPayload) -> do
    let ev = CalendarEvent
          { id = "ev-" ++ ownerName p ++ "-" ++ title p
          , ownerName = ownerName p
          , title = title p
          , startsAt = startsAt p
          , endsAt = endsAt p
          , withName = withName p
          }
    modifyMVar_ store $ \st ->
      let events = Map.findWithDefault [] (ownerName p) (calendar st)
      in return st { calendar = Map.insert (ownerName p) (ev : events) (calendar st) }
    respondOk respond ev

handleGetCalendar :: MVar Store -> String -> (LBS.ByteString -> IO ()) -> IO ()
handleGetCalendar store name respond = do
  s <- readMVar store
  respondOk respond (Map.findWithDefault [] name (calendar s))

respondOk :: ToJSON a => (LBS.ByteString -> IO ()) -> a -> IO ()
respondOk respond v =
  respond $ responseLBS status200 [("Content-Type", "application/json")] $
    encode (TelephonyResponse True (Just v) Nothing)

respondErr :: (LBS.ByteString -> IO ()) -> String -> IO ()
respondErr respond msg =
  respond $ responseLBS status400 [("Content-Type", "application/json")] $
    encode (TelephonyResponse False Nothing (Just msg) :: TelephonyResponse ())
