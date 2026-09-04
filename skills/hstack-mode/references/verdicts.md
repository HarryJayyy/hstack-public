# Verdict Vocabulary

- `PASS`: all required checks passed against the identified final state and no required work remains.
- `NEEDS CORRECTION`: a verified defect or failed required check remains within scope.
- `BLOCKED BUSINESS DECISION`: implementation depends on an owner decision that cannot safely be inferred.
- `BLOCKED EXTERNAL`: required authority, service, credential, review, or environment is unavailable; state exactly which one.
- `PARKED`: the owner deliberately paused the work; preserve its state and disabled controls.
- `UNVERIFIED`: evidence is absent, incomplete, stale, or attached to a different state.

Use multiple dimensions when necessary. Example: `NEEDS CORRECTION (Sonar failure) + BLOCKED REVIEW (required approval)`.

## Machine exit states

Keep human verdicts separate from command states:

- `PASS` (`0`): this command's evidence contract is satisfied.
- `VIOLATION` (`2`): a known rule or required check failed.
- `INCOMPLETE` (`3`): required evidence, authorization, review, or adapter result is missing.
- `STALE` (`4`): evidence exists but its TTL expired.
- `UNKNOWN` (`5`): the relevant state could not be classified.

`PASS` applies only to the command's declared subject. A passing inventory does not prove the product correct.
