const axios = require("axios");

const KNOWN_DEMO_IPS = {
  "198.51.100.22": { country: "Russia", region: "Moscow", city: "Moscow", isp: "Cheap-VPS-Hosting LLC", lat: 55.7558, lon: 37.6173 },
  "203.0.113.77": { country: "Romania", region: "Bucharest", city: "Bucharest", isp: "Suspicious Hosting SRL", lat: 44.4268, lon: 26.1025 },
  "203.0.113.199": { country: "Russia", region: "Moscow", city: "Moscow", isp: "Cheap-VPS-Hosting LLC", lat: 55.7558, lon: 37.6173 },
  "198.51.100.201": { country: "Netherlands", region: "North Holland", city: "Amsterdam", isp: "Free-Webhost-Cluster BV", lat: 52.3676, lon: 4.9041 },
  "192.0.2.10": { country: "India", region: "Maharashtra", city: "Mumbai", isp: "ExampleCorp Internal Mail Server", lat: 19.0760, lon: 72.8777 },
};

const FALLBACK_POOL = [
  { country: "Russia", region: "Moscow", city: "Moscow", isp: "Unattributed Hosting Provider" },
  { country: "China", region: "Guangdong", city: "Shenzhen", isp: "Unattributed Hosting Provider" },
  { country: "Nigeria", region: "Lagos", city: "Lagos", isp: "Unattributed Hosting Provider" },
  { country: "Romania", region: "Bucharest", city: "Bucharest", isp: "Unattributed Hosting Provider" },
  { country: "United States", region: "California", city: "Los Angeles", isp: "Unattributed Hosting Provider" },
].map((p, i) => ({
  ...p,
  lat: [55.7558, 22.5431, 6.5244, 44.4268, 34.0522][i],
  lon: [37.6173, 114.0579, 3.3792, 26.1025, -118.2437][i],
}));

function isPrivateOrReserved(ip) {
  return /^10\./.test(ip) || /^192\.168\./.test(ip) || /^172\.(1[6-9]|2\d|3[01])\./.test(ip) || /^127\./.test(ip);
}

function hashPick(ip, pool) {
  let hash = 0;
  for (let i = 0; i < ip.length; i++) hash = (hash * 31 + ip.charCodeAt(i)) >>> 0;
  return pool[hash % pool.length];
}

async function getIPIntelligence(ip) {
  if (KNOWN_DEMO_IPS[ip]) {
    return { ip, ...KNOWN_DEMO_IPS[ip], source: "demo-known" };
  }
  if (isPrivateOrReserved(ip)) {
    return { ip, country: "Private/Internal Network", region: "-", city: "-", isp: "-", lat: null, lon: null, source: "internal" };
  }

  try {
    const resp = await axios.get(`http://ip-api.com/json/${ip}`, { timeout: 2500 });
    if (resp.data && resp.data.status === "success") {
      return {
        ip,
        country: resp.data.country,
        region: resp.data.regionName,
        city: resp.data.city,
        isp: resp.data.isp,
        lat: resp.data.lat,
        lon: resp.data.lon,
        source: "live",
      };
    }
  } catch (err) {
    // fall through to offline fallback below
  }

  return { ip, ...hashPick(ip, FALLBACK_POOL), source: "demo-fallback" };
}

module.exports = { getIPIntelligence };