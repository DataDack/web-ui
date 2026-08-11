// Seasonal console chrome. Self-contained on purpose: every file in this
// folder plus the `.freedom-*` block in index.css is the whole treatment, so
// retiring it is one folder delete and one CSS block delete.
export { AshokaChakra } from "./AshokaChakra"
export { ChakraWatermark } from "./ChakraWatermark"
export { ConfettiBurst } from "./ConfettiBurst"
export { FreedomSaleBanner } from "./FreedomSaleBanner"
export { IndependenceGreeting } from "./IndependenceGreeting"
export {
  FREEDOM_SALE_YEAR,
  isFreedomSaleActive,
  isIndependenceDay,
  useFreedomSale,
  useIndependenceGreeting,
} from "./freedom-sale"
