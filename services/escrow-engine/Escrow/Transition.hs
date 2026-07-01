{-# LANGUAGE OverloadedStrings #-}

module Escrow.Transition where

import Escrow.Types
import Data.Text (Text)
import qualified Data.Text as T

-- | Pure state machine — only valid transitions are representable in this function.
transition :: EscrowContract -> TransitionRequest -> Either Text EscrowContract
transition c req =
  case (status c, requestType req) of
    (Draft, "fund") ->
      if requesterId req == buyerId c
        then Right c { status = Funded }
        else Left "Only buyer can fund escrow"
    (Funded, "activate") ->
      if requesterId req == buyerId c || requesterId req == sellerId c
        then Right c { status = Active }
        else Left "Only buyer or seller can activate"
    (Active, "request_release") ->
      if requesterId req == sellerId c
        then Right c { status = ReleasePending }
        else Left "Only seller can request release"
    (ReleasePending, "settle") ->
      if requesterId req == buyerId c
        then Right c { status = Settled }
        else Left "Only buyer can settle"
    (Active, "dispute") ->
      if requesterId req == buyerId c || requesterId req == sellerId c
        then Right c { status = Disputed }
        else Left "Only parties can dispute"
    (Draft, "cancel") -> Right c { status = Cancelled }
    (Funded, "cancel") ->
      if requesterId req == buyerId c
        then Right c { status = Cancelled }
        else Left "Only buyer can cancel funded escrow"
    (s, _) -> Left (T.pack ("Invalid transition '" ++ requestType req ++ "' from " ++ show s))

validateCreate :: String -> String -> Double -> Either Text ()
validateCreate buyer seller amt
  | null buyer = Left "buyer required"
  | null seller = Left "seller required"
  | buyer == seller = Left "buyer and seller must differ"
  | amt <= 0 = Left "amount must be positive"
  | otherwise = Right ()
