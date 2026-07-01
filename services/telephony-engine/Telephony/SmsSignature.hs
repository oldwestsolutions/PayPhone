{-# LANGUAGE OverloadedStrings #-}

module Telephony.SmsSignature where

import Data.Text (Text)
import qualified Data.Text as T

-- | Signature is computed client-side (Rust SHA-256); engine validates presence.
requireSmsSignature :: String -> Either Text ()
requireSmsSignature sig
  | null sig = Left "SMS requires a Stellar digital signature"
  | length sig < 32 = Left "Invalid SMS digital signature"
  | otherwise = Right ()
