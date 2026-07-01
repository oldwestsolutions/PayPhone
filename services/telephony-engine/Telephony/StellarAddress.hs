{-# LANGUAGE OverloadedStrings #-}

module Telephony.StellarAddress where

import Data.Text (Text)
import qualified Data.Text as T

-- | Readable Stellar lumens dial string shown in UI (name is the callable "number").
formatDialAddress :: String -> String -> String
formatDialAddress name publicKey =
  "@" ++ name ++ " · " ++ take 8 publicKey ++ "…" ++ drop (max 0 (length publicKey - 4)) publicKey

normalizeDialInput :: String -> String
normalizeDialInput raw =
  let trimmed = T.unpack $ T.strip $ T.pack raw
      stripped = case trimmed of
        ('@':rest) -> rest
        _ -> trimmed
  in stripped

-- | Resolve a dial target to display form.
resolveDialTarget :: String -> Maybe String -> String
resolveDialTarget name mPub =
  case mPub of
    Just pk -> formatDialAddress name pk
    Nothing -> "@" ++ name
