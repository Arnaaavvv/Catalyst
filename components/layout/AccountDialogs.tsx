"use client";
import type { PublicUser } from "@/lib/auth";
import type { LifeOSState } from "@/lib/types";
import ConfirmModal from "@/components/shared/ConfirmModal";
import AccountPage from "@/components/account/AccountPage";

export type AccountDialog = "account" | "clear" | "logout" | null;

// The account page and the two destructive confirmations, shared by the
// desktop rail and the mobile "More" sheet so both entry points open exactly
// the same thing. Only one can be open at a time, hence a single `dialog`.
export default function AccountDialogs({
  dialog, onClose, user, state, onClearData, onLogOut, onUserUpdate,
}: {
  dialog: AccountDialog; onClose: () => void; user: PublicUser; state: LifeOSState;
  onClearData: () => void; onLogOut: () => void; onUserUpdate: (user: PublicUser) => void;
}) {
  if (dialog === "clear") {
    return (
      <ConfirmModal
        title="Clear all data?"
        message="This permanently deletes every task, habit, goal, health log and academic record on this account including any example template data. This can't be undone."
        confirmLabel="Clear everything"
        onCancel={onClose}
        onConfirm={() => { onClearData(); onClose(); }}
      />
    );
  }
  if (dialog === "logout") {
    return (
      <ConfirmModal
        title="Log out?"
        message="You'll need to log back in to see your data again."
        confirmLabel="Log out"
        onCancel={onClose}
        onConfirm={() => { onClose(); onLogOut(); }}
      />
    );
  }
  if (dialog === "account") {
    return <AccountPage user={user} state={state} onClose={onClose} onUpdated={onUserUpdate} />;
  }
  return null;
}