import { MessageBar } from "@/components/fluent";

/**
 * The visible vault-isolation notice every staff registry view must carry.
 * Identity lives in a separate database; this UI only ever sees pseudonyms.
 */
export function VaultNotice() {
  return (
    <MessageBar intent="privacy" title="Vault isolation">
      Participants appear by pseudonym only. Names and email addresses are held in the identity vault and are never present in this
      view or in the data behind it.
    </MessageBar>
  );
}
