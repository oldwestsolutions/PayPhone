{-# LANGUAGE OverloadedStrings #-}

module Telephony.Routing where

import Data.Map (Map)
import qualified Data.Map as Map
import Data.Text (Text)
import qualified Data.Text as T
import Telephony.Types
import Telephony.Tolls (validateTollPolicy)

-- | Initiate a name-to-name call: bridges personal lines; callee sees RESTRICTED.
initiateNameCall :: Map String PhoneLine -> NameCallPayload -> Either Text CallSession
initiateNameCall lines payload =
  case Map.lookup (fromName payload) lines of
    Nothing -> Left "Caller must connect a personal phone line in Settings"
    Just fromLine ->
      case Map.lookup (toName payload) lines of
        Nothing -> Left "Callee has not connected a personal phone line"
        Just toLine -> do
          validateTollPolicy toLine (callTollUsdc toLine)
          let sid = "call-" ++ fromName payload ++ "-" ++ toName payload ++ "-" ++ show (length (Map.keys lines))
          Right CallSession
            { sessionId = sid
            , fromName = fromName payload
            , toName = toName payload
            , callerIdShown = restrictedCallerId
            , status = Connected
            , bridgeFrom = personalPhone fromLine
            , bridgeTo = personalPhone toLine
            , minBillableSeconds = defaultMinBillableSeconds
            , message = T.unpack $
                "Name-to-name call active. Callee sees RESTRICTED. Bridging "
                <> T.pack (stellarName fromLine)
                <> " → "
                <> T.pack (stellarName toLine)
                <> " via Payphone proxy."
            }

registerPhone :: Map String PhoneLine -> RegisterPhonePayload -> Either Text PhoneLine
registerPhone _ p =
  if null (stellarName p) || null (personalPhone p)
    then Left "stellarName and personalPhone required"
    else Right PhoneLine
      { stellarName = stellarName p
      , personalPhone = personalPhone p
      , accountType = accountType p
      , callTollUsdc = callTollUsdc p
      , smsTollUsdc = smsTollUsdc p
      , messageGiftUsdc = messageGiftUsdc p
      }

endCall :: CallSession -> EndCallPayload -> CallSession
endCall s p =
  s { status = Ended
    , message = "Call ended after " ++ show (durationSeconds p) ++ "s. Billing applies after "
      ++ show (minBillableSeconds s) ++ "s minimum."
    }
