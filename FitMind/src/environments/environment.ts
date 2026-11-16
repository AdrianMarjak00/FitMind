export const environment = {
  production: true,
  // Platby (Stripe) sú zatiaľ vypnuté – všetky funkcie sú odomknuté pre každého.
  // Po zapnutí musí paymentsApiUrl ukazovať na serverless funkciu so Stripe kľúčmi.
  paymentsEnabled: false,
  paymentsApiUrl: ''
};
