import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  scenarios: {
    storefront: {
      executor: "constant-vus",
      vus: 30,
      duration: "5m",
    },
  },
};

const BASE = __ENV.BASE_URL || "https://sitesellr-api.onrender.com";
const SUB = __ENV.SUBDOMAIN || "demo";

export default function () {
  const sf = http.get(`${BASE}/api/public/storefront/${SUB}`);
  check(sf, { "storefront 200": (r) => r.status === 200 });

  const reserve = http.post(
    `${BASE}/api/public/storefront/${SUB}/cart/reserve`,
    JSON.stringify({ items: [] }),
    { headers: { "Content-Type": "application/json" } }
  );
  check(reserve, { "reserve accepted": (r) => r.status === 200 || r.status === 400 });

  sleep(0.3);
}
