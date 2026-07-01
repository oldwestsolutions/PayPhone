{-# LANGUAGE OverloadedStrings #-}

module Telephony.Billing where

import Data.Text (Text)
import qualified Data.Text as T

-- | Billable seconds: zero until min threshold (30 or 60), then full duration.
billableDuration :: Int -> Int -> Int
billableDuration minSecs actual
  | actual < minSecs = 0
  | otherwise = actual

-- | USDC charge from rate-per-second (matches Solidity PayPhoneEscrowERC20).
computeCharge :: Double -> Int -> Double
computeCharge ratePerSecond billableSecs =
  ratePerSecond * fromIntegral billableSecs

-- | Validate escrow can be created: buyer wallet must cover amount.
validateEscrowBalance :: Double -> Double -> Either Text ()
validateEscrowBalance buyerBalance amount
  | buyerBalance < amount =
      Left (T.unpack $ "Insufficient wallet balance: need " <> T.pack (show amount) <> " USDC")
  | amount <= 0 = Left "Escrow amount must be positive"
  | otherwise = Right ()
