/**
 * Razorpay Checkout.js — Frontend Integration
 *
 * This file runs in the BROWSER. It handles:
 * 1. Loading the Razorpay Checkout.js script
 * 2. Opening the payment modal
 * 3. Sending verification data back to the server
 *
 * ---------------------------------------------------------------------------
 * CHECKOUT FLOW FOR SUBSCRIPTIONS
 * ---------------------------------------------------------------------------
 *
 * 1. Frontend calls POST /api/razorpay/subscriptions with { tier, billingCycle }
 * 2. Server creates a subscription on Razorpay and returns:
 *    { subscriptionId, razorpayKeyId, checkoutOptions }
 * 3. Frontend loads Checkout.js and opens the modal with subscription_id
 * 4. Customer completes payment (card, UPI, netbanking, wallet, etc.)
 * 5. On success, Razorpay returns to handler:
 *    { razorpay_payment_id, razorpay_subscription_id, razorpay_signature }
 * 6. Frontend sends these to POST /api/razorpay/subscriptions/verify
 * 7. Server verifies signature and activates the plan
 *
 * ---------------------------------------------------------------------------
 * SCRIPT TAG (add to layout.tsx or _document.tsx):
 *
 *   <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
 *
 * Or dynamically load via loadRazorpayScript() below.
 * ---------------------------------------------------------------------------
 *
 * CHECKOUT OPTIONS REFERENCE:
 *
 * {
 *   key: string,                    // RAZORPAY_KEY_ID (public key)
 *   subscription_id: string,        // From createSubscription response
 *   name: string,                   // Your company name (shown in checkout)
 *   description: string,            // Plan description
 *   image: string,                  // Logo URL (optional, recommended 256x256)
 *   handler: (response) => void,    // Success callback
 *   prefill: {
 *     name: string,                 // Customer name
 *     email: string,                // Customer email
 *     contact: string,              // Customer phone (with country code)
 *   },
 *   notes: Record<string, string>,  // Max 15 key-value pairs
 *   theme: {
 *     color: string,                // Brand color hex
 *     backdrop_color: string,       // Backdrop color (optional)
 *   },
 *   modal: {
 *     ondismiss: () => void,        // Called when user closes modal
 *     escape: boolean,              // Allow Escape key to close (default true)
 *     animation: boolean,           // Enable animations (default true)
 *     confirm_close: boolean,       // Confirm before closing (default false)
 *   },
 *   recurring_token: {              // For subscription payments
 *     max_amount: number,           // Max debit amount in paise
 *     expire_by: number,            // Token expiry (Unix timestamp)
 *   },
 * }
 *
 * SUCCESS RESPONSE (handler callback):
 * {
 *   razorpay_payment_id: "pay_XXXXX",
 *   razorpay_subscription_id: "sub_XXXXX",
 *   razorpay_signature: "hex_string",
 * }
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CheckoutSuccessResponse {
  razorpay_payment_id: string;
  razorpay_subscription_id: string;
  razorpay_signature: string;
}

export interface SubscriptionCreateResponse {
  subscriptionId: string;
  razorpayKeyId: string;
  shortUrl: string;
  checkoutOptions: {
    key: string;
    subscription_id: string;
    name: string;
    description: string;
    prefill: Record<string, string>;
    notes: Record<string, string>;
    theme: { color: string };
  };
}

export interface VerifyResponse {
  success: boolean;
  tier: string;
  billingCycle: string;
  subscriptionId: string;
  subscriptionStatus: string;
  paymentId: string;
}

// ---------------------------------------------------------------------------
// Script loader
// ---------------------------------------------------------------------------

/**
 * Dynamically load the Razorpay Checkout.js script.
 * Safe to call multiple times -- it only loads once.
 */
export function loadRazorpayScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("Cannot load Razorpay script on server"));
      return;
    }

    // Already loaded
    if ((window as any).Razorpay) {
      resolve();
      return;
    }

    // Check if script is already being loaded
    const existing = document.querySelector(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]',
    );
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () =>
        reject(new Error("Failed to load Razorpay script")),
      );
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error("Failed to load Razorpay Checkout script"));
    document.body.appendChild(script);
  });
}

// ---------------------------------------------------------------------------
// Subscription checkout flow
// ---------------------------------------------------------------------------

/**
 * Complete subscription checkout flow.
 *
 * This function:
 * 1. Creates a subscription via the API
 * 2. Opens Razorpay Checkout modal
 * 3. Verifies the payment on success
 * 4. Returns the verified result
 *
 * @example
 * ```tsx
 * const handleUpgrade = async () => {
 *   try {
 *     setLoading(true);
 *     const result = await initiateSubscriptionCheckout({
 *       tier: "GROWTH",
 *       billingCycle: "monthly",
 *       customerEmail: user.email,
 *       customerPhone: user.phone,
 *       customerName: user.name,
 *     });
 *     toast.success(`Upgraded to ${result.tier}!`);
 *     router.refresh();
 *   } catch (error) {
 *     if (error.message === "Payment cancelled by user") {
 *       // User closed the modal -- no action needed
 *       return;
 *     }
 *     toast.error("Payment failed. Please try again.");
 *   } finally {
 *     setLoading(false);
 *   }
 * };
 * ```
 */
export async function initiateSubscriptionCheckout(params: {
  tier: "STARTER" | "GROWTH" | "PRO";
  billingCycle: "monthly" | "annual";
  customerEmail?: string;
  customerPhone?: string;
  customerName?: string;
}): Promise<VerifyResponse> {
  // Step 1: Load Razorpay script
  await loadRazorpayScript();

  // Step 2: Create subscription via API
  const createRes = await fetch("/api/razorpay/subscriptions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      tier: params.tier,
      billingCycle: params.billingCycle,
    }),
  });

  if (!createRes.ok) {
    const error = await createRes.json();
    throw new Error(error.error ?? "Failed to create subscription");
  }

  const data: SubscriptionCreateResponse = await createRes.json();

  // Step 3: Open Razorpay Checkout modal
  const checkoutResponse = await new Promise<CheckoutSuccessResponse>(
    (resolve, reject) => {
      const options = {
        ...data.checkoutOptions,
        prefill: {
          ...data.checkoutOptions.prefill,
          name: params.customerName ?? "",
          email: params.customerEmail ?? "",
          contact: params.customerPhone ?? "",
        },
        handler: (response: CheckoutSuccessResponse) => {
          resolve(response);
        },
        modal: {
          ondismiss: () => {
            reject(new Error("Payment cancelled by user"));
          },
          confirm_close: true,
        },
      };

      const rzp = new (window as any).Razorpay(options);

      rzp.on("payment.failed", (response: any) => {
        reject(
          new Error(
            response.error?.description ?? "Payment failed",
          ),
        );
      });

      rzp.open();
    },
  );

  // Step 4: Verify payment on server
  const verifyRes = await fetch("/api/razorpay/subscriptions/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(checkoutResponse),
  });

  if (!verifyRes.ok) {
    const error = await verifyRes.json();
    throw new Error(error.error ?? "Payment verification failed");
  }

  return verifyRes.json();
}
