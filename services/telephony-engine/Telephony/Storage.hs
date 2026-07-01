{-# LANGUAGE OverloadedStrings #-}

module Telephony.Storage where

import Data.Text (Text)
import qualified Data.Text as T

-- | Filecoin-backed storage toll: price per GiB-month in USDC.
filecoinStorageRatePerGib :: Double
filecoinStorageRatePerGib = 0.50

-- | Data transfer toll per MiB in USDC.
dataTransferRatePerMib :: Double
dataTransferRatePerMib = 0.02

quoteStorage :: Double -> Double
quoteStorage gibMonths = gibMonths * filecoinStorageRatePerGib

quoteDataTransfer :: Double -> Double
quoteDataTransfer mib = mib * dataTransferRatePerMib

quoteCommsBundle :: Double -> Double -> Double
quoteCommsBundle storageGibMonths transferMib =
  quoteStorage storageGibMonths + quoteDataTransfer transferMib

validateQuota :: Double -> Double -> Double -> Either Text ()
validateQuota usedGib quotaGib additionalGib
  | usedGib + additionalGib > quotaGib =
      Left (T.pack $ "Storage quota exceeded: need " ++ show additionalGib ++ " GiB more (Filecoin toll applies)")
  | otherwise = Right ()
