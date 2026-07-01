{-# LANGUAGE DeriveGeneric #-}
{-# LANGUAGE OverloadedStrings #-}

module Main where

import Control.Concurrent.MVar (MVar, modifyMVar, modifyMVar_, newMVar, readMVar)
import Data.Aeson (FromJSON, ToJSON, eitherDecode, encode)
import qualified Data.ByteString.Lazy as LBS
import Data.Map (Map)
import qualified Data.Map as Map
import Data.Text (Text)
import qualified Data.Text as T
import Escrow.Marketing
import Escrow.SupplyChain
import Escrow.Transition (transition, validateCreate)
import Escrow.Types
import GHC.Generics (Generic)
import Network.HTTP.Types (status200, status400, status404)
import Network.Wai (Application, requestBody, requestMethod, pathInfo, responseLBS)
import Network.Wai.Handler.Warp (run)
import Network.Wai.Middleware.Cors (cors, simpleCorsResourcePolicy)
import System.IO (hPutStrLn, stderr)

data CreatePayload = CreatePayload
  { contractId :: !String
  , buyerId :: !String
  , sellerId :: !String
  , amount :: !Double
  , currency :: !String
  , buyerBalance :: !Double
  , minBillableSeconds :: !(Maybe Int)
  , ratePerSecond :: !(Maybe Double)
  , callSessionId :: !(Maybe String)
  } deriving (Generic)

instance ToJSON CreatePayload
instance FromJSON CreatePayload

data MarketingCreatePayload = MarketingCreatePayload
  { marketingId :: !String
  , brandId :: !String
  , creatorId :: !String
  , campaignName :: !String
  , amount :: !Double
  , buyerBalance :: !Double
  } deriving (Generic)

instance ToJSON MarketingCreatePayload
instance FromJSON MarketingCreatePayload

data SupplyCreatePayload = SupplyCreatePayload
  { supplyId :: !String
  , buyerId :: !String
  , supplierId :: !String
  , sku :: !String
  , quantity :: !Int
  , amount :: !Double
  , buyerBalance :: !Double
  } deriving (Generic)

instance ToJSON SupplyCreatePayload
instance FromJSON SupplyCreatePayload

data EscrowStore = EscrowStore
  { standard :: !(Map String EscrowContract)
  , marketing :: !(Map String MarketingEscrow)
  , supplyChain :: !(Map String SupplyChainEscrow)
  }

emptyStore :: EscrowStore
emptyStore = EscrowStore Map.empty Map.empty Map.empty

main :: IO ()
main = do
  store <- newMVar emptyStore
  let port = 4004
  hPutStrLn stderr $ "Payphone Escrow Engine on port " ++ show port
  run port (cors (const $ Just simpleCorsResourcePolicy) $ app store)

app :: MVar EscrowStore -> Application
app store req respond = do
  body <- requestBody req
  case (requestMethod req, pathInfo req) of
    ("GET", ["health"]) ->
      respond $ responseLBS status200 [("Content-Type", "application/json")] "{\"ok\":true}"
    ("POST", ["contracts"]) -> handleCreate store body respond
    ("GET", ["contracts", cid]) -> handleGet store cid respond
    ("POST", ["contracts", cid, "transition"]) -> handleTransition store cid body respond
    ("POST", ["marketing"]) -> handleMarketingCreate store body respond
    ("POST", ["marketing", mid, "transition"]) -> handleMarketingTransition store (T.unpack mid) body respond
    ("POST", ["supply-chain"]) -> handleSupplyCreate store body respond
    ("POST", ["supply-chain", sid, "transition"]) -> handleSupplyTransition store (T.unpack sid) body respond
    _ -> respond $ responseLBS status404 [] "Not found"

handleCreate :: MVar EscrowStore -> LBS.ByteString -> (LBS.ByteString -> IO ()) -> IO ()
handleCreate store body respond = case eitherDecode body of
  Left err -> respondErr respond err
  Right (p :: CreatePayload) ->
    case validateCreate (buyerId p) (sellerId p) (amount p) (buyerBalance p) of
      Left e -> respondErr respond (T.unpack e)
      Right _ -> do
        let minSecs = maybe defaultMinBillableSeconds id (minBillableSeconds p)
            rate = maybe 0.0 id (ratePerSecond p)
            c = newContract (contractId p) (buyerId p) (sellerId p) (amount p) (currency p)
                  (buyerBalance p) minSecs rate (callSessionId p)
        modifyMVar_ store $ \st -> return st { standard = Map.insert (contractId p) c (standard st) }
        respondOk respond $ TransitionResponse (Just c) Nothing Nothing Nothing

handleGet :: MVar EscrowStore -> Text -> (LBS.ByteString -> IO ()) -> IO ()
handleGet store cid respond = do
  st <- readMVar store
  case Map.lookup (T.unpack cid) (standard st) of
    Nothing -> respond $ responseLBS status404 [] "Not found"
    Just c -> respondOk respond $ TransitionResponse (Just c) Nothing Nothing Nothing

handleTransition :: MVar EscrowStore -> Text -> LBS.ByteString -> (LBS.ByteString -> IO ()) -> IO ()
handleTransition store cid body respond = case eitherDecode body of
  Left err -> respondErr respond err
  Right treq -> do
    result <- modifyMVar store $ \st ->
      case Map.lookup (T.unpack cid) (standard st) of
        Nothing -> return (st, Left "Contract not found")
        Just c ->
          case transition c treq of
            Left e -> return (st, Left (T.unpack e))
            Right (c', billable, charged) ->
              return (st { standard = Map.insert (T.unpack cid) c' (standard st) }, Right (c', billable, charged))
    case result of
      Left e -> respondErr respond e
      Right (c', billable, charged) ->
        respondOk respond $ TransitionResponse (Just c') Nothing billable charged

handleMarketingCreate :: MVar EscrowStore -> LBS.ByteString -> (LBS.ByteString -> IO ()) -> IO ()
handleMarketingCreate store body respond = case eitherDecode body of
  Left err -> respondErr respond err
  Right (p :: MarketingCreatePayload) ->
    case validateMarketingCreate (brandId p) (creatorId p) (amount p) (buyerBalance p) of
      Left e -> respondErr respond (T.unpack e)
      Right _ -> do
        let m = newMarketing (marketingId p) (brandId p) (creatorId p) (campaignName p) (amount p) (buyerBalance p)
        modifyMVar_ store $ \st -> return st { marketing = Map.insert (marketingId p) m (marketing st) }
        respondOk respond m

handleMarketingTransition :: MVar EscrowStore -> String -> LBS.ByteString -> (LBS.ByteString -> IO ()) -> IO ()
handleMarketingTransition store mid body respond = case eitherDecode body of
  Left err -> respondErr respond err
  Right treq -> do
    result <- modifyMVar store $ \st ->
      case Map.lookup mid (marketing st) of
        Nothing -> return (st, Left "Marketing escrow not found")
        Just m ->
          case transitionMarketing m treq of
            Left e -> return (st, Left (T.unpack e))
            Right m' -> return (st { marketing = Map.insert mid m' (marketing st) }, Right m')
    case result of
      Left e -> respondErr respond e
      Right m' -> respondOk respond m'

handleSupplyCreate :: MVar EscrowStore -> LBS.ByteString -> (LBS.ByteString -> IO ()) -> IO ()
handleSupplyCreate store body respond = case eitherDecode body of
  Left err -> respondErr respond err
  Right (p :: SupplyCreatePayload) ->
    case validateSupplyCreate (buyerId p) (supplierId p) (quantity p) (amount p) (buyerBalance p) of
      Left e -> respondErr respond (T.unpack e)
      Right _ -> do
        let s = newSupplyChain (supplyId p) (buyerId p) (supplierId p) (sku p) (quantity p) (amount p) (buyerBalance p)
        modifyMVar_ store $ \st -> return st { supplyChain = Map.insert (supplyId p) s (supplyChain st) }
        respondOk respond s

handleSupplyTransition :: MVar EscrowStore -> String -> LBS.ByteString -> (LBS.ByteString -> IO ()) -> IO ()
handleSupplyTransition store sid body respond = case eitherDecode body of
  Left err -> respondErr respond err
  Right treq -> do
    result <- modifyMVar store $ \st ->
      case Map.lookup sid (supplyChain st) of
        Nothing -> return (st, Left "Supply chain escrow not found")
        Just s ->
          case transitionSupplyChain s treq of
            Left e -> return (st, Left (T.unpack e))
            Right s' -> return (st { supplyChain = Map.insert sid s' (supplyChain st) }, Right s')
    case result of
      Left e -> respondErr respond e
      Right s' -> respondOk respond s'

respondOk :: ToJSON a => (LBS.ByteString -> IO ()) -> a -> IO ()
respondOk respond v =
  respond $ responseLBS status200 [("Content-Type", "application/json")] (encode v)

respondErr :: (LBS.ByteString -> IO ()) -> String -> IO ()
respondErr respond msg =
  respond $ responseLBS status400 [("Content-Type", "application/json")] $
    encode (TransitionResponse Nothing (Just msg) Nothing Nothing)
