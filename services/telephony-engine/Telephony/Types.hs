{-# LANGUAGE DeriveGeneric #-}
{-# LANGUAGE OverloadedStrings #-}

module Telephony.Types where

import Control.Applicative ((<*>))
import Data.Aeson (FromJSON, ToJSON, defaultOptions, genericToJSON, genericParseJSON, object, (.=), withObject, (.:), (.:?))
import Data.Aeson.Types (Options(..))
import GHC.Generics (Generic)

data AccountType = Consumer | Business
  deriving (Eq, Show, Generic)

instance ToJSON AccountType
instance FromJSON AccountType

data CallStatus = Ringing | Connected | Ended
  deriving (Eq, Show, Generic)

instance ToJSON CallStatus
instance FromJSON CallStatus

-- | Personal phone line bound to a readable Stellar lumens name.
data PhoneLine = PhoneLine
  { stellarName :: !String
  , personalPhone :: !String
  , accountType :: !AccountType
  , callTollUsdc :: !(Maybe Double)
  , smsTollUsdc :: !(Maybe Double)
  , messageGiftUsdc :: !(Maybe Double)
  } deriving (Eq, Show, Generic)

instance ToJSON PhoneLine where
  toJSON = genericToJSON jsonOpts
instance FromJSON PhoneLine where
  parseJSON = genericParseJSON jsonOpts

data RegisterPhonePayload = RegisterPhonePayload
  { stellarName :: !String
  , personalPhone :: !String
  , accountType :: !AccountType
  , callTollUsdc :: !(Maybe Double)
  , smsTollUsdc :: !(Maybe Double)
  , messageGiftUsdc :: !(Maybe Double)
  } deriving (Eq, Show, Generic)

instance ToJSON RegisterPhonePayload where
  toJSON = genericToJSON jsonOpts
instance FromJSON RegisterPhonePayload where
  parseJSON = genericParseJSON jsonOpts

data NameCallPayload = NameCallPayload
  { fromName :: !String
  , toName :: !String
  , circleWalletId :: !String
  } deriving (Eq, Show, Generic)

instance ToJSON NameCallPayload where
  toJSON = genericToJSON jsonOpts
instance FromJSON NameCallPayload where
  parseJSON = genericParseJSON jsonOpts

data EndCallPayload = EndCallPayload
  { durationSeconds :: !Int
  } deriving (Eq, Show, Generic)

instance ToJSON EndCallPayload where
  toJSON = genericToJSON jsonOpts
instance FromJSON EndCallPayload where
  parseJSON = genericParseJSON jsonOpts

-- | Outbound caller ID is always RESTRICTED — real numbers never cross the wire.
data StellarProfile = StellarProfile
  { stellarName :: !String
  , publicKey :: !String
  , dialAddress :: !String
  , reachable :: !Bool
  } deriving (Eq, Show, Generic)

instance ToJSON StellarProfile where
  toJSON = genericToJSON jsonOpts
instance FromJSON StellarProfile where
  parseJSON = genericParseJSON jsonOpts

data PayQuote = PayQuote
  { storageGibMonths :: !Double
  , transferMib :: !Double
  , totalUsdc :: !Double
  , filecoinRate :: !Double
  , transferRate :: !Double
  , reason :: !String
  } deriving (Eq, Show, Generic)

instance ToJSON PayQuote where
  toJSON = genericToJSON jsonOpts
instance FromJSON PayQuote where
  parseJSON = genericParseJSON jsonOpts

data PayQuoteRequest = PayQuoteRequest
  { storageGibMonths :: !Double
  , transferMib :: !Double
  , reason :: !String
  } deriving (Eq, Show, Generic)

instance ToJSON PayQuoteRequest where
  toJSON = genericToJSON jsonOpts
instance FromJSON PayQuoteRequest where
  parseJSON = genericParseJSON jsonOpts

data CallRecording = CallRecording
  { recordingId :: !String
  , sessionId :: !String
  , ownerName :: !String
  , localPath :: !String
  , sharedToken :: !String
  , createdAt :: !Integer
  } deriving (Eq, Show, Generic)

instance ToJSON CallRecording where
  toJSON = genericToJSON jsonOpts
instance FromJSON CallRecording where
  parseJSON = genericParseJSON jsonOpts

data RegisterRecordingPayload = RegisterRecordingPayload
  { sessionId :: !String
  , ownerName :: !String
  , localPath :: !String
  } deriving (Eq, Show, Generic)

instance ToJSON RegisterRecordingPayload where
  toJSON = genericToJSON jsonOpts
instance FromJSON RegisterRecordingPayload where
  parseJSON = genericParseJSON jsonOpts

data CallSession = CallSession
  { sessionId :: !String
  , fromName :: !String
  , toName :: !String
  , callerIdShown :: !String
  , status :: !CallStatus
  , bridgeFrom :: !String
  , bridgeTo :: !String
  , minBillableSeconds :: !Int
  , message :: !String
  , toDialAddress :: !String
  } deriving (Eq, Show, Generic)

instance ToJSON CallSession where
  toJSON = genericToJSON jsonOpts
instance FromJSON CallSession where
  parseJSON = genericParseJSON jsonOpts

data SmsMessage = SmsMessage
  { id :: !String
  , fromName :: !String
  , toName :: !String
  , body :: !String
  , sentAt :: !Integer
  , giftUsdc :: !(Maybe Double)
  , stellarPublicKey :: !String
  , digitalSignature :: !String
  } deriving (Eq, Show, Generic)

instance ToJSON SmsMessage where
  toJSON = genericToJSON jsonOpts
instance FromJSON SmsMessage where
  parseJSON = genericParseJSON jsonOpts

data SendSmsPayload = SendSmsPayload
  { fromName :: !String
  , toName :: !String
  , body :: !String
  , giftUsdc :: !(Maybe Double)
  , stellarPublicKey :: !String
  , digitalSignature :: !String
  } deriving (Eq, Show, Generic)

instance ToJSON SendSmsPayload where
  toJSON = genericToJSON jsonOpts
instance FromJSON SendSmsPayload where
  parseJSON = genericParseJSON jsonOpts

data CalendarEvent = CalendarEvent
  { id :: !String
  , ownerName :: !String
  , title :: !String
  , startsAt :: !Integer
  , endsAt :: !Integer
  , withName :: !(Maybe String)
  } deriving (Eq, Show, Generic)

instance ToJSON CalendarEvent where
  toJSON = genericToJSON jsonOpts
instance FromJSON CalendarEvent where
  parseJSON = genericParseJSON jsonOpts

data CreateEventPayload = CreateEventPayload
  { ownerName :: !String
  , title :: !String
  , startsAt :: !Integer
  , endsAt :: !Integer
  , withName :: !(Maybe String)
  } deriving (Eq, Show, Generic)

instance ToJSON CreateEventPayload where
  toJSON = genericToJSON jsonOpts
instance FromJSON CreateEventPayload where
  parseJSON = genericParseJSON jsonOpts

data TelephonyResponse a = TelephonyResponse
  { ok :: Bool
  , telephonyData :: Maybe a
  , error :: Maybe String
  } deriving (Eq, Show, Generic)

instance ToJSON a => ToJSON (TelephonyResponse a) where
  toJSON r = object
    [ "ok" .= ok r
    , "data" .= telephonyData r
    , "error" .= error r
    ]

instance FromJSON a => FromJSON (TelephonyResponse a) where
  parseJSON = withObject "TelephonyResponse" $ \o ->
    TelephonyResponse <$> o .: "ok" <*> o .:? "data" <*> o .:? "error"

jsonOpts :: Options
jsonOpts = defaultOptions

restrictedCallerId :: String
restrictedCallerId = "RESTRICTED"

defaultMinBillableSeconds :: Int
defaultMinBillableSeconds = 60
