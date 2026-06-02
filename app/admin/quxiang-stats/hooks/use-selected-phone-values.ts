import type { PhoneItem } from "../types";

import { useMemo } from "react";

import { getSelectedPhonesForQuery } from "../services";

export function useSelectedPhoneValues(
  selectedPhoneIds: Set<string>,
  phones: PhoneItem[],
): string[] {
  return useMemo(
    () => getSelectedPhonesForQuery(selectedPhoneIds, phones),
    [selectedPhoneIds, phones],
  );
}
