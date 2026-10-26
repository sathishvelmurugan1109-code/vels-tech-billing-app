function normalizeState(state) {
  const value = String(state ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  if (value === "tn" || value === "33") return "tamil nadu";
  return value;
}

function roundPaise(value) {
  const amount = Number(value);
  return Number.isFinite(amount) ? Math.round((amount + Number.EPSILON) * 100) : 0;
}

function splitGstTotal(gstTotal, businessState, customerState) {
  const totalPaise = Math.max(0, roundPaise(gstTotal));
  const isIntraState =
    normalizeState(businessState) === normalizeState(customerState);

  if (!isIntraState) {
    return {
      cgst: 0,
      sgst: 0,
      igst: totalPaise / 100,
    };
  }

  const cgstPaise = Math.round(totalPaise / 2);
  return {
    cgst: cgstPaise / 100,
    sgst: (totalPaise - cgstPaise) / 100,
    igst: 0,
  };
}

module.exports = { normalizeState, splitGstTotal };
