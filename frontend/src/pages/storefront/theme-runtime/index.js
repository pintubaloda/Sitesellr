import KuzmaFashionRuntime from "./KuzmaFashionRuntime";
import ElectronicsRuntime from "./ElectronicsRuntime";
import GroceryFastCartRuntime from "./GroceryFastCartRuntime";
import LuxurySignatureRuntime from "./LuxurySignatureRuntime";
import SsSimpleRuntime from "./SsSimpleRuntime";
import SitesellrEcomLuxeRuntime from "./SitesellrEcomLuxeRuntime";

export const resolveThemeRuntime = (activeTheme) => {
  const slug = String(activeTheme?.slug || "").toLowerCase();
  if (slug === "kuzma-fashion-pro") return { key: "kuzma-fashion-pro", Component: KuzmaFashionRuntime };
  if (slug === "sitesellr-ecom-luxe") return { key: "sitesellr-ecom-luxe-runtime", Component: SitesellrEcomLuxeRuntime };
  if (slug === "ss-simple") return { key: "ss-simple-runtime", Component: SsSimpleRuntime };
  if (slug === "electronics-mega-store" || slug === "electrogrid" || slug === "electro-grid") return { key: "electronics-runtime", Component: ElectronicsRuntime };
  if (slug === "grocery-fastcart") return { key: "grocery-fastcart-runtime", Component: GroceryFastCartRuntime };
  if (slug === "luxury-signature") return { key: "luxury-signature-runtime", Component: LuxurySignatureRuntime };
  return { key: "default", Component: null };
};
