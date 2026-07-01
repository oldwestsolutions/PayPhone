{-# LANGUAGE DeriveGeneric #-}
{-# LANGUAGE OverloadedStrings #-}

module Escrow.Marketing where

import Data.Aeson (FromJSON, ToJSON, defaultOptions, genericToJSON, genericParseJSON)
import Data.Aeson.Types (Options(..))
import Escrow.Types
import Data.Text (Text)
import qualified Data.Text as T
import GHC.Generics (Generic)

jsonOpts :: Options
jsonOpts = defaultOptions

-- | Marketing escrow: brand pays creator; deliverables tracked by milestone.
data MarketingEscrow = MarketingEscrow
  { marketingId :: !String
  , brandId :: !String
  , creatorId :: !String
  , campaignName :: !String
  , amount :: !Double
  , status :: !EscrowStatus
  , buyerBalance :: !Double
  } deriving (Eq, Show, Generic)

instance ToJSON MarketingEscrow where
  toJSON = genericToJSON jsonOpts
instance FromJSON MarketingEscrow where
  parseJSON = genericParseJSON jsonOpts

newMarketing :: String -> String -> String -> String -> Double -> Double -> MarketingEscrow
newMarketing mid brand creator campaign amt bal =
  MarketingEscrow mid brand creator campaign amt Draft bal

transitionMarketing :: MarketingEscrow -> TransitionRequest -> Either Text MarketingEscrow
transitionMarketing m req =
  case (status m, requestType req) of
    (Draft, "fund")
      | requesterId req == brandId m -> Right m { status = Funded }
      | otherwise -> Left "Only brand can fund marketing escrow"
    (Funded, "activate")
      | requesterId req == brandId m || requesterId req == creatorId m ->
          Right m { status = Active }
      | otherwise -> Left "Only brand or creator can activate"
    (Active, "request_release")
      | requesterId req == creatorId m -> Right m { status = ReleasePending }
      | otherwise -> Left "Only creator can request release"
    (ReleasePending, "settle")
      | requesterId req == brandId m -> Right m { status = Settled }
      | otherwise -> Left "Only brand can settle"
    (Active, "dispute")
      | requesterId req == brandId m || requesterId req == creatorId m ->
          Right m { status = Disputed }
      | otherwise -> Left "Only parties can dispute"
    (Draft, "cancel") -> Right m { status = Cancelled }
    (s, t) -> Left (T.pack ("Invalid marketing transition '" ++ t ++ "' from " ++ show s))

validateMarketingCreate :: String -> String -> Double -> Double -> Either Text ()
validateMarketingCreate brand creator amt bal
  | null brand = Left "brand required"
  | null creator = Left "creator required"
  | brand == creator = Left "brand and creator must differ"
  | bal < amt = Left "Insufficient wallet balance for marketing escrow"
  | amt <= 0 = Left "amount must be positive"
  | otherwise = Right ()
