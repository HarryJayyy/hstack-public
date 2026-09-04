# Procurement Invariants

Model the chain explicitly: request -> approval -> order -> receipt -> supplier invoice -> payment, plus rejection, short/over receipt, return, cancellation, and amendment.

Verify role separation, supplier/company scope, ordered versus received versus billed quantities, taxes and landed costs, duplicate supplier invoices, three-way matching policy, partial fulfillment, and downstream stock/ledger effects. Policy gaps such as tolerance, approval threshold, or invoice matching are owner decisions.
