import KuzmaFashionRuntime from "./KuzmaFashionRuntime";
import ElectronicsRuntime from "./ElectronicsRuntime";
import GroceryFastCartRuntime from "./GroceryFastCartRuntime";
import LuxurySignatureRuntime from "./LuxurySignatureRuntime";

export const resolveThemeRuntime = (activeTheme) => {
  const slug = String(activeTheme?.slug || "").toLowerCase();
  if (slug === "kuzma-fashion-pro") return { key: "kuzma-fashion-pro", Component: KuzmaFashionRuntime };
  if (slug === "electronics-mega-store" || slug === "electrogrid" || slug === "electro-grid") return { key: "electronics-runtime", Component: ElectronicsRuntime };
  if (slug === "grocery-fastcart") return { key: "grocery-fastcart-runtime", Component: GroceryFastCartRuntime };
  if (slug === "luxury-signature") return { key: "luxury-signature-runtime", Component: LuxurySignatureRuntime };
  return { key: "default", Component: null };
};
