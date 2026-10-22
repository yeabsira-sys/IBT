"use client";

import { useState } from "react";
import useSWR from "swr";
import { FiRefreshCw } from "react-icons/fi";
import { fetcher } from "@/lib/fetcher";
import { when } from "@/lib/format";
import { ROLES, ROLE_LABELS } from "@/lib/roles";
import { useToast } from "@/store/toastStore";

/** AdminUsers — role management. The API refuses self-demotion. */
export default function AdminUsers({ initialUsers, currentUserId }) {
  const toast = useToast();
  const [busyId, setBusyId] = useState(null);
  const { data, error, mutate, isValidating } = useSWR("/api/admin/users", fetcher, {
    fallbackData: { data: initialUsers },
    refreshInterval: 30000,
    revalidateOnFocus: true,
  });

  const users = data?.data ?? initialUsers;

  const updateRole = async (id, role) => {
    setBusyId(id);
    try {
      const response = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.message ?? "Could not update the role.");
      toast("Role updated.", "success");
      await mutate();
    } catch (updateError) {
      toast(updateError.message, "error");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="admin-users">
      <div className="portal-toolbar">
        <p className="portal-toolbar__note">
          <FiRefreshCw className={isValidating ? "is-spinning" : undefined} aria-hidden="true" />
          {isValidating ? "Refreshing users…" : `${users.length} accounts · refreshes every 30 seconds.`}
        </p>
      </div>

      {error && <p className="form-error">Could not refresh users. Showing the last known list.</p>}

      <div className="data-table-wrap portal-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Mobile</th>
              <th>Joined</th>
              <th>Role</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>
                  <strong>{user.fullName}</strong>
                  {user.id === currentUserId && <span className="table-note"> (you)</span>}
                </td>
                <td>{user.email}</td>
                <td>{user.phone ? `+251 ${user.phone}` : "—"}</td>
                <td>{when.format(new Date(user.createdAt))}</td>
                <td>
                  <select
                    className="role-select"
                    value={user.role}
                    onChange={(event) => updateRole(user.id, event.target.value)}
                    disabled={user.id === currentUserId || busyId === user.id}
                    aria-label={`Role for ${user.fullName}`}
                  >
                    {ROLES.map((role) => (
                      <option key={role} value={role}>
                        {ROLE_LABELS[role]}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
