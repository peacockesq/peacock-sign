# LexySign Signature Tags for Docassemble Templates

Purpose: Eva and drafting agents should place stable signature markers while generating DOCX/PDF legal documents so LexySign can auto-place fields later instead of requiring manual drag/drop.

These tags are intentionally ugly and machine-readable. They should be placed exactly where the signer field belongs, usually on or just above the visible signature line. The final LexySign import step will remove/cover the marker and create the actual field.

## Canonical tag format

```text
[[LEXYSIGN:<field_type> role="<role>" label="<human label>" w="<width>" h="<height>"]]
```

Field types:

- `signature`
- `date`
- `text`
- `initials`
- `checkbox`

Required attributes:

- `role` — stable signer role. Do not use a person name as the role.
- `label` — human-readable field label.

Optional attributes:

- `w` — field width in PDF points. Default signature width: `180`.
- `h` — field height in PDF points. Default signature height: `38`.
- `required` — `true` or `false`; default `true`.
- `order` — numeric signing order if the packet is sequential.

## Standard roles

Use these role names unless Willie approves a new one:

| Role | Use |
| --- | --- |
| `client` | Primary law-firm client/participant |
| `co_client` | Co-client, alternate payee, or second represented party |
| `participant` | Plan participant in QDRO/signature packet contexts |
| `alternate_payee` | Alternate payee in QDRO/signature packet contexts |
| `spouse` | Divorce flow spouse signer when roles are not plan-specific |
| `attorney` | Willie/Peacock Law Firm internal signature |
| `witness` | Witness/notary-adjacent field, only where template requires it |
| `internal_reviewer` | Internal Lexy/firm acknowledgement, not client-facing |

## Examples

Client retainer signature block:

```text
Client Signature: [[LEXYSIGN:signature role="client" label="Client signature" w="190" h="38"]]
Date: [[LEXYSIGN:date role="client" label="Client signature date" w="85" h="22"]]
```

Attorney signature block:

```text
Peacock Law Firm: [[LEXYSIGN:signature role="attorney" label="Attorney signature" w="190" h="38"]]
Date: [[LEXYSIGN:date role="attorney" label="Attorney signature date" w="85" h="22"]]
```

QDRO party acknowledgment:

```text
Participant: [[LEXYSIGN:signature role="participant" label="Participant signature" w="190" h="38" order="1"]]
Date: [[LEXYSIGN:date role="participant" label="Participant signature date" w="85" h="22" order="1"]]

Alternate Payee: [[LEXYSIGN:signature role="alternate_payee" label="Alternate Payee signature" w="190" h="38" order="2"]]
Date: [[LEXYSIGN:date role="alternate_payee" label="Alternate Payee signature date" w="85" h="22" order="2"]]
```

Internal Lexy document approval:

```text
Internal reviewer: [[LEXYSIGN:signature role="internal_reviewer" label="Internal reviewer signature" w="190" h="38"]]
Date: [[LEXYSIGN:date role="internal_reviewer" label="Internal review date" w="85" h="22"]]
```

## Placement rules

1. Put the tag on the same line as the visible signature/date line or immediately above it.
2. For drawn signatures, place the widget slightly above the visible signature line. OpenSign/LexySign draws ink inside the rectangle; centered rectangles can make signatures land below the line.
3. Do not use free-form labels like `party1` or `signer2` unless the template is genuinely generic.
4. Do not create judge/court signature tags unless the court actually accepts that signing route.
5. For QDRO drafts, signature tags are only for party/attorney acknowledgments. Plan preapproval and court entry remain separate workflow stages.
6. Keep tag text out of final client-visible PDFs unless the LexySign field importer has run and verified removal/coverage.

## Docassemble pattern

In Docassemble Jinja/DOCX templates, render tags conditionally with the role context already known:

```jinja2
{% if require_client_signature %}
Client Signature: [[LEXYSIGN:signature role="client" label="Client signature" w="190" h="38"]]
Date: [[LEXYSIGN:date role="client" label="Client signature date" w="85" h="22"]]
{% endif %}
```

For multi-party QDRO packets:

```jinja2
{% if participant_signature_required %}
Participant: [[LEXYSIGN:signature role="participant" label="Participant signature" order="1"]]
Date: [[LEXYSIGN:date role="participant" label="Participant signature date" order="1"]]
{% endif %}
{% if alternate_payee_signature_required %}
Alternate Payee: [[LEXYSIGN:signature role="alternate_payee" label="Alternate Payee signature" order="2"]]
Date: [[LEXYSIGN:date role="alternate_payee" label="Alternate Payee signature date" order="2"]]
{% endif %}
```

## Implementation status

This is the canonical authoring convention. The next LexySign integration step is to implement the importer that scans generated PDFs/DOCX-derived PDFs for these markers, computes coordinates, creates LexySign/OpenSign placeholder JSON, and removes or covers the marker text before sending.
