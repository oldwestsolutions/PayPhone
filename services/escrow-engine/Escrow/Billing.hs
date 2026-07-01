{-# LANGUAGE OverloadedStrings #-}

module Escrow.Billing where

import Data.Text (Text)
import qualified Data.Text as T

billableDuration :: Int -> Int -> Int
billableDuration minSecs actual
  | actual < minSecs = 0
  | otherwise = actual

computeCharge :: Double -> Int -> Double
computeCharge ratePerSecond billableSecs =
  ratePerSecond * fromIntegral billableSecs

validateEscrowBalance :: Double -> Double -> Either Text ()
validateEscrowBalance buyerBalance amount
  | buyerBalance < amount =
      Left (T.unpack $ "Insufficient wallet balance: need " <> T.pack (show amount) <> " to back this escrow")
  | amount <= 0 = Left "Escrow amount must be positive"
  | otherwise = Right ()
