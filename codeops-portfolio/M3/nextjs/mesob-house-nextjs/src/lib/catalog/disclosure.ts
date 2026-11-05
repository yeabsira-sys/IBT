export type AllergenSource = "INGREDIENT" | "CROSS_CONTACT";

export type AllergenCandidate = {
  code: string;
  name: string;
  source: AllergenSource;
  isConfirmed: boolean;
  notes?: string;
};

export type AllergenDisclosure = {
  status: "CONFIRMED" | "NOT_CONFIRMED";
  confirmed: AllergenCandidate[];
  unconfirmed: AllergenCandidate[];
  contains: string[];
  mayContain: string[];
  message: string;
};

/**
 * There is deliberately no "allergen-free" state. An empty or unconfirmed
 * allergen list means the kitchen has not confirmed the information, and the
 * public UI must say exactly that.
 */
export function allergenDisclosure(
  rows: AllergenCandidate[],
): AllergenDisclosure {
  const confirmed = rows.filter((row) => row.isConfirmed);
  const unconfirmed = rows.filter((row) => !row.isConfirmed);
  const contains = confirmed.map((row) => row.name);
  const mayContain = unconfirmed.map((row) => row.name);

  if (confirmed.length > 0) {
    const message = unconfirmed.length
      ? `Contains: ${contains.join(", ")}. Additional allergen information is under review.`
      : `Contains: ${contains.join(", ")}.`;
    return {
      status: "CONFIRMED",
      confirmed,
      unconfirmed,
      contains,
      mayContain,
      message,
    };
  }

  return {
    status: "NOT_CONFIRMED",
    confirmed,
    unconfirmed,
    contains: [],
    mayContain,
    message: "Allergen information has not been confirmed.",
  };
}

export type DietaryVerification = "UNVERIFIED" | "VERIFIED" | "REJECTED";

export type DietaryClaim = {
  code: string;
  name: string;
  verificationStatus: DietaryVerification;
};

export type DietaryDisclosure = {
  verified: DietaryClaim[];
  pending: DietaryClaim[];
};

/** Only verified claims are public. A claim under review is not a promise. */
export function dietaryDisclosure(rows: DietaryClaim[]): DietaryDisclosure {
  return {
    verified: rows.filter((row) => row.verificationStatus === "VERIFIED"),
    pending: rows.filter((row) => row.verificationStatus !== "VERIFIED"),
  };
}
