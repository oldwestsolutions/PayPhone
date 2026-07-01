{-# LANGUAGE DeriveGeneric #-}
{-# LANGUAGE OverloadedStrings #-}

module Main where

import Control.Concurrent.MVar (MVar, modifyMVar, newMVar, readMVar)
import Data.Aeson (FromJSON, ToJSON, eitherDecode, encode)
import qualified Data.ByteString.Lazy as LBS
import Data.Map (Map)
import qualified Data.Map as Map
import Data.Text (Text)
import qualified Data.Text as T
import Escrow.Billing ()
import Escrow.Transition (transition, validateCreate)
import Escrow.Types
import GHC.Generics (Generic)
import Network.HTTP.Types (status200, status400, status404)
import Network.Wai (Application, requestBody, requestMethod, pathInfo, responseLBS)
import Network.Wai.Handler.Warp (run)
import Network.Wai.Middleware.Cors (cors, simpleCorsResourcePolicy)
import System.IO (hPutStrLn, stderr)

data CreatePayload = CreatePayload
  { contractId :: !String
  , buyerId :: !String
  , sellerId :: !String
  , amount :: !Double
  , currency :: !String
  , buyerBalance :: !Double
  , minBillableSeconds :: !(Maybe Int)
  , ratePerSecond :: !(Maybe Double)
  , callSessionId :: !(Maybe String)
  } deriving (Generic)

instance ToJSON CreatePayload
instance FromJSON CreatePayload

main :: IO ()
main = do
  store <- newMVar Map.empty
  let port = 4004
  hPutStrLn stderr $ "Payphone Escrow Engine on port " ++ show port
  run port (cors (const $ Just simpleCorsResourcePolicy) $ app store)

app :: MVar (Map String EscrowContract) -> Application
app store req respond = do
  body <- requestBody req
  case (requestMethod req, pathInfo req) of
    ("GET", ["health"]) ->
      respond $ responseLBS status200 [("Content-Type", "application/json")] "{\"ok\":true}"
    ("POST", ["contracts"]) -> handleCreate store body respond
    ("GET", ["contracts", cid]) -> handleGet store cid respond
    ("POST", ["contracts", cid, "transition"]) -> handleTransition store cid body respond
    _ -> respond $ responseLBS status404 [] "Not found"

handleCreate :: MVar (Map String EscrowContract) -> LBS.ByteString -> (LBS.ByteString -> IO ()) -> IO ()
handleCreate store body respond = case eitherDecode body of
  Left err -> respondErr respond err
  Right (p :: CreatePayload) ->
    case validateCreate (buyerId p) (sellerId p) (amount p) (buyerBalance p) of
      Left e -> respondErr respond (T.unpack e)
      Right _ -> do
        let minSecs = maybe defaultMinBillableSeconds id (minBillableSeconds p)
            rate = maybe 0.0 id (ratePerSecond p)
            c = newContract (contractId p) (buyerId p) (sellerId p) (amount p) (currency p)
                  (buyerBalance p) minSecs rate (callSessionId p)
        modifyMVar store $ \m -> return (Map.insert (contractId p) c m, ())
        respondOk respond $ TransitionResponse (Just c) Nothing Nothing Nothing

handleGet :: MVar (Map String EscrowContract) -> Text -> (LBS.ByteString -> IO ()) -> IO ()
handleGet store cid respond = do
  m <- readMVar store
  case Map.lookup (T.unpack cid) m of
    Nothing -> respond $ responseLBS status404 [] "Not found"
    Just c -> respondOk respond $ TransitionResponse (Just c) Nothing Nothing Nothing

handleTransition :: MVar (Map String EscrowContract) -> Text -> LBS.ByteString -> (LBS.ByteString -> IO ()) -> IO ()
handleTransition store cid body respond = case eitherDecode body of
  Left err -> respondErr respond err
  Right treq -> do
    result <- modifyMVar store $ \m ->
      case Map.lookup (T.unpack cid) m of
        Nothing -> return (m, Left "Contract not found")
        Just c ->
          case transition c treq of
            Left e -> return (m, Left (T.unpack e))
            Right (c', billable, charged) ->
              return (Map.insert (T.unpack cid) c' m, Right (c', billable, charged))
    case result of
      Left e -> respondErr respond e
      Right (c', billable, charged) ->
        respondOk respond $ TransitionResponse (Just c') Nothing billable charged

respondOk :: ToJSON a => (LBS.ByteString -> IO ()) -> a -> IO ()
respondOk respond v =
  respond $ responseLBS status200 [("Content-Type", "application/json")] (encode v)

respondErr :: (LBS.ByteString -> IO ()) -> String -> IO ()
respondErr respond msg =
  respond $ responseLBS status400 [("Content-Type", "application/json")] $
    encode (TransitionResponse Nothing (Just msg) Nothing Nothing)
