{-# LANGUAGE DeriveGeneric #-}
{-# LANGUAGE OverloadedStrings #-}

module Escrow.Types where

import Data.Aeson (FromJSON, ToJSON, defaultOptions, genericToJSON, genericParseJSON)
import Data.Aeson.Types (Options(..))
import GHC.Generics (Generic)

data EscrowStatus
  = Draft | Funded | Active | ReleasePending | Settled | Disputed | Cancelled
  deriving (Eq, Show, Generic, Bounded, Enum)

instance ToJSON EscrowStatus
instance FromJSON EscrowStatus

data EscrowContract = EscrowContract
  { contractId :: !String
  , buyerId :: !String
  , sellerId :: !String
  , amount :: !Double
  , currency :: !String
  , status :: !EscrowStatus
  , buyerBalance :: !Double
  , minBillableSeconds :: !Int
  , ratePerSecond :: !Double
  , callSessionId :: !(Maybe String)
  } deriving (Eq, Show, Generic)

instance ToJSON EscrowContract where
  toJSON = genericToJSON jsonOpts
instance FromJSON EscrowContract where
  parseJSON = genericParseJSON jsonOpts

data TransitionRequest = TransitionRequest
  { requestType :: !String
  , requesterId :: !String
  , durationSeconds :: !(Maybe Int)
  } deriving (Eq, Show, Generic)

instance ToJSON TransitionRequest where
  toJSON = genericToJSON jsonOpts
instance FromJSON TransitionRequest where
  parseJSON = genericParseJSON jsonOpts

data TransitionResponse = TransitionResponse
  { contract :: Maybe EscrowContract
  , error :: Maybe String
  , billableSeconds :: Maybe Int
  , chargedAmount :: Maybe Double
  } deriving (Eq, Show, Generic)

instance ToJSON TransitionResponse where
  toJSON = genericToJSON jsonOpts
instance FromJSON TransitionResponse where
  parseJSON = genericParseJSON jsonOpts

jsonOpts :: Options
jsonOpts = defaultOptions

newContract :: String -> String -> String -> Double -> String -> Double -> Int -> Double -> Maybe String -> EscrowContract
newContract cid buyer seller amt cur bal minSecs rate sid =
  EscrowContract cid buyer seller amt cur Draft bal minSecs rate sid

defaultMinBillableSeconds :: Int
defaultMinBillableSeconds = 60
