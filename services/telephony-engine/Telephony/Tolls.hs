{-# LANGUAGE OverloadedStrings #-}

module Telephony.Tolls where

import Data.Text (Text)
import qualified Data.Text as T
import Telephony.Types

-- | Only Business accounts may charge tolls. Consumers may offer gifts only.
validateTollPolicy :: PhoneLine -> Maybe Double -> Either Text ()
validateTollPolicy line toll =
  case toll of
    Nothing -> Right ()
    Just amt | amt <= 0 -> Left "Toll must be positive"
    Just _ ->
      case accountType line of
        Business -> Right ()
        Consumer -> Left "Only business accounts can charge call/SMS tolls. Consumers may offer gifts."

validateGift :: Maybe Double -> Either Text ()
validateGift Nothing = Right ()
validateGift (Just amt)
  | amt <= 0 = Left "Gift amount must be positive"
  | otherwise = Right ()

validateSmsToll :: PhoneLine -> Maybe Double -> Either Text ()
validateSmsToll line toll = validateTollPolicy line toll
