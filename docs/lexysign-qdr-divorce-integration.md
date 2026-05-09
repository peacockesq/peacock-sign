# LexySign Integration Plan for Divorce Flows and LexyQDRO v2

LexySign should be a signature provider behind workflow seams, not a drafting engine replacement.

## Provider seam

Create a `SignatureProvider` adapter in Mission Control / LexyQDRO v2:

```ts
interface SignatureProvider {
  createPacket(input: SignaturePacketInput): Promise<SignaturePacket>;
  getPacketStatus(packetId: string): Promise<SignaturePacketStatus>;
  cancelPacket(packetId: string): Promise<void>;
}
```

Minimum packet fields:

```yaml
matter_id:
workflow: divorce|qdro|internal
source_document_id:
source_document_hash:
template_version:
roles:
  - role: client|co_client|participant|alternate_payee|attorney|internal_reviewer
    name:
    email:
    signing_order:
fields:
  - role:
    type: signature|date|text|initials|checkbox
    page:
    x:
    y:
    w:
    h:
status:
lexysign_document_id:
lexysign_signer_ids:
sent_at:
completed_at:
signed_pdf_url:
audit_certificate_url:
```

## Divorce-flow use cases

1. Retainer agreement signature.
2. Internal attorney approval/acknowledgment.
3. Settlement-document signature packets after Willie approval.
4. Client authorization forms.

## LexyQDRO v2 use cases

1. Client/party acknowledgment signature packets where legally appropriate.
2. Internal approval signatures for draft-finalization packets.
3. Final signed PDF and audit trail import back into Paperless/NocoDB.
4. Status writeback to matter stage: `signatures_sent`, `partially_signed`, `signed`, `signature_declined`, `signature_expired`.

## Gates that cannot be skipped

- QDRO plan preapproval is not the same thing as party signature collection.
- Court filing/entry remains separate from LexySign completion.
- Client-facing legal signature packets require Willie-approved templates or an approval box unless a specific automation lane is already approved.
- Every signed artifact must be imported/stored with matter ID, source hash, signed PDF, and audit/certificate URL.

## First build slice

1. Add signature tags to one Docassemble retainer template.
2. Build marker scanner/field extractor for generated PDF output.
3. Create LexySign packet through API or Parse bridge.
4. Send to an internal smoke signer.
5. Complete signing.
6. Download signed PDF and certificate.
7. Write status/artifact links back to the matter record.
8. Only then wire it into QDRO/divorce production flows.
