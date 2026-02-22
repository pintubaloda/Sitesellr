import KuzmaFashionRuntime from "./KuzmaFashionRuntime";

export const resolveThemeRuntime = (activeTheme) => {
  const slug = String(activeTheme?.slug || "").toLowerCase();
  if (slug === "kuzma-fashion-pro") return { key: "kuzma-fashion-pro", Component: KuzmaFashionRuntime };
  return { key: "default", Component: null };
};
