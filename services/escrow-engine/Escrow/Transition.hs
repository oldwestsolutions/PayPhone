{-# LANGUAGE OverloadedStrings #-}

module Escrow.Transition where

import Escrow.Billing (billableDuration, computeCharge, validateEscrowBalance)
import Escrow.Types
import Data.Text (Text)
import qualified Data.Text as T

transition :: EscrowContract -> TransitionRequest -> Either Text (EscrowContract, Maybe Int, Maybe Double)
transition c req =
  case (status c, requestType req) of
    (Draft, "fund") ->
      if requesterId req == buyerId c
        then Right (c { status = Funded }, Nothing, Nothing)
        else Left "Only buyer can fund escrow"
    (Funded, "activate") ->
      if requesterId req == buyerId c || requesterId req == sellerId c
        then Right (c { status = Active }, Nothing, Nothing)
        else Left "Only buyer or seller can activate"
    (Active, "request_release") ->
      if requesterId req == sellerId c
        then Right (c { status = ReleasePending }, Nothing, Nothing)
        else Left "Only seller can request release"
    (ReleasePending, "settle") ->
      if requesterId req == buyerId c
        then Right (c { status = Settled }, Nothing, Nothing)
        else Left "Only buyer can settle"
    (Active, "settle_call") ->
      case durationSeconds req of
        Nothing -> Left "durationSeconds required for settle_call"
        Just dur ->
          let billable = billableDuration (minBillableSeconds c) dur
              charge = computeCharge (ratePerSecond c) billable
          in if charge > amount c
            then Left "Call charge exceeds escrow cap"
            else if requesterId req == buyerId c || requesterId req == sellerId c
              then Right (c { status = Settled }, Just billable, Just charge)
              else Left "Only parties can settle call escrow"
    (Active, "dispute") ->
      if requesterId req == buyerId c || requesterId req == sellerId c
        then Right (c { status = Disputed }, Nothing, Nothing)
        else Left "Only parties can dispute"
    (Draft, "cancel") -> Right (c { status = Cancelled }, Nothing, Nothing)
    (Funded, "cancel") ->
      if requesterId req == buyerId c
        then Right (c { status = Cancelled }, Nothing, Nothing)
        else Left "Only buyer can cancel funded escrow"
    (s, _) -> Left (T.pack ("Invalid transition '" ++ requestType req ++ "' from " ++ show s))

validateCreate :: String -> String -> Double -> Double -> Either Text ()
validateCreate buyer seller amt buyerBalance = do
  if null buyer then Left "buyer required" else pure ()
  if null seller then Left "seller required" else pure ()
  if buyer == seller then Left "buyer and seller must differ" else pure ()
  validateEscrowBalance buyerBalance amt
