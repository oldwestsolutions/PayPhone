{-# LANGUAGE DeriveGeneric #-}
{-# LANGUAGE OverloadedStrings #-}

module Escrow.SupplyChain where

import Data.Aeson (FromJSON, ToJSON, defaultOptions, genericToJSON, genericParseJSON)
import Data.Aeson.Types (Options(..))
import Escrow.Types
import Data.Text (Text)
import qualified Data.Text as T
import GHC.Generics (Generic)

jsonOpts :: Options
jsonOpts = defaultOptions

-- | Supply chain escrow: buyer locks funds until shipment confirmed.
data SupplyChainEscrow = SupplyChainEscrow
  { supplyId :: !String
  , buyerId :: !String
  , supplierId :: !String
  , sku :: !String
  , quantity :: !Int
  , amount :: !Double
  , status :: !EscrowStatus
  , buyerBalance :: !Double
  } deriving (Eq, Show, Generic)

instance ToJSON SupplyChainEscrow where
  toJSON = genericToJSON jsonOpts
instance FromJSON SupplyChainEscrow where
  parseJSON = genericParseJSON jsonOpts

newSupplyChain :: String -> String -> String -> String -> Int -> Double -> Double -> SupplyChainEscrow
newSupplyChain sid buyer supplier sku qty amt bal =
  SupplyChainEscrow sid buyer supplier sku qty amt Draft bal

transitionSupplyChain :: SupplyChainEscrow -> TransitionRequest -> Either Text SupplyChainEscrow
transitionSupplyChain s req =
  case (status s, requestType req) of
    (Draft, "fund")
      | requesterId req == buyerId s -> Right s { status = Funded }
      | otherwise -> Left "Only buyer can fund supply escrow"
    (Funded, "ship")
      | requesterId req == supplierId s -> Right s { status = Active }
      | otherwise -> Left "Only supplier can mark shipped"
    (Active, "confirm_delivery")
      | requesterId req == buyerId s -> Right s { status = ReleasePending }
      | otherwise -> Left "Only buyer can confirm delivery"
    (ReleasePending, "settle")
      | requesterId req == buyerId s -> Right s { status = Settled }
      | otherwise -> Left "Only buyer can settle"
    (Active, "dispute")
      | requesterId req == buyerId s || requesterId req == supplierId s ->
          Right s { status = Disputed }
      | otherwise -> Left "Only parties can dispute"
    (Draft, "cancel") -> Right s { status = Cancelled }
    (s', t) -> Left (T.pack ("Invalid supply transition '" ++ t ++ "' from " ++ show s'))

validateSupplyCreate :: String -> String -> Int -> Double -> Double -> Either Text ()
validateSupplyCreate buyer supplier qty amt bal
  | null buyer = Left "buyer required"
  | null supplier = Left "supplier required"
  | buyer == supplier = Left "buyer and supplier must differ"
  | qty <= 0 = Left "quantity must be positive"
  | bal < amt = Left "Insufficient wallet balance for supply chain escrow"
  | amt <= 0 = Left "amount must be positive"
  | otherwise = Right ()
