"use client";

import { useState } from "react";
import useSWR from "swr";
import { FiEdit2, FiPlus, FiRefreshCw, FiSave, FiTrash2, FiX } from "react-icons/fi";
import Button from "../ui/Button";
import Stars from "../reviews/Stars";
import { fetcher } from "@/lib/fetcher";
import { useToast } from "@/store/toastStore";

const splitList = (value) =>
  String(value ?? "")
    .split(/[\n,]/)
    .map((part) => part.trim())
    .filter(Boolean);

const listText = (value) => (Array.isArray(value) ? value.join(", ") : "");

function blankOption(index = 0) {
  return {
    value: `option-${index + 1}`,
    title: "New choice",
    description: "",
    note: "",
    priceDelta: "0",
    isDefault: index === 0,
    isActive: true,
    sortOrder: index,
  };
}

function blankGroup(index = 0) {
  return {
    key: `group-${index + 1}`,
    title: "New option group",
    icon: "",
    badge: "",
    columns: 1,
    isMulti: false,
    maxSelections: 1,
    sortOrder: index,
    isActive: true,
    options: [blankOption(0)],
  };
}

function blankForm(categories = []) {
  return {
    id: "",
    name: "",
    nativeName: "",
    tagline: "",
    description: "",
    longDescription: "",
    category: categories[0]?.value ?? "stews",
    price: "",
    imageUrl: "",
    spiceLevel: "",
    servings: "",
    ingredients: "",
    allergens: "",
    tags: "",
    badgeText: "",
    badgeTone: "brand",
    sortOrder: 0,
    isSpecial: false,
    isActive: true,
    isFasting: false,
    isComplimentary: false,
    isSide: false,
  };
}

function formFromItem(item) {
  return {
    id: item.id,
    name: item.name ?? "",
    nativeName: item.nativeName ?? "",
    tagline: item.tagline ?? "",
    description: item.description ?? "",
    longDescription: item.longDescription ?? "",
    category: item.category ?? "stews",
    price: String((item.priceCents ?? 0) / 100),
    imageUrl: item.imageUrl ?? "",
    spiceLevel: item.spiceLevel ?? item.heat ?? "",
    servings: item.servings ?? "",
    ingredients: listText(item.ingredients),
    allergens: listText(item.allergens),
    tags: listText(item.tags),
    badgeText: item.badgeText ?? "",
    badgeTone: item.badgeTone ?? "brand",
    sortOrder: item.sortOrder ?? 0,
    isSpecial: Boolean(item.isSpecial),
    isActive: item.isActive !== false,
    isFasting: Boolean(item.isFasting),
    isComplimentary: Boolean(item.isComplimentary),
    isSide: Boolean(item.isSide),
  };
}

function groupsFromItem(item) {
  return (item.optionGroups ?? []).map((group, groupIndex) => ({
    key: group.key,
    title: group.title,
    icon: group.icon ?? "",
    badge: group.badge ?? "",
    columns: group.columns ?? 1,
    isMulti: Boolean(group.multi ?? group.isMulti),
    maxSelections: group.max ?? group.maxSelections ?? 1,
    sortOrder: group.step ?? group.sortOrder ?? groupIndex,
    isActive: group.isActive !== false,
    options: (group.options ?? []).map((option, optionIndex) => ({
      value: option.value,
      title: option.title,
      description: option.description ?? "",
      note: option.note ?? "",
      priceDelta: String((option.priceDeltaCents ?? 0) / 100),
      isDefault: Boolean(option.isDefault),
      isActive: option.isActive !== false,
      sortOrder: option.sortOrder ?? optionIndex,
    })),
  }));
}

function Field({ label, hint, children, wide = false }) {
  return (
    <label className={`admin-field${wide ? " admin-field--wide" : ""}`}>
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}

function flag(key, label, hint, form, set) {
  return (
    <label className="admin-check" key={key}>
      <input
        type="checkbox"
        checked={Boolean(form[key])}
        onChange={() => set(key, !form[key])}
      />
      <span>
        <strong>{label}</strong>
        {hint && <small>{hint}</small>}
      </span>
    </label>
  );
}

/** AdminMenu — the server-owned catalogue editor. */
export default function AdminMenu({ initialItems = [], initialCategories = [] }) {
  const toast = useToast();
  const { data, error, mutate, isValidating } = useSWR("/api/admin/menu", fetcher, {
    fallbackData: { data: { items: initialItems, categories: initialCategories } },
    revalidateOnFocus: false,
  });
  const items = data?.data?.items ?? initialItems;
  const categories = data?.data?.categories ?? initialCategories;

  const [selected, setSelected] = useState(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(() => blankForm(initialCategories));
  const [groups, setGroups] = useState([]);
  const [pairingIds, setPairingIds] = useState([]);
  const [saving, setSaving] = useState(false);

  const editing = selected !== null;
  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const renderFlag = (key, label, hint) => flag(key, label, hint, form, set);

  const openNew = () => {
    setSelected(null);
    setOpen(true);
    setForm(blankForm(categories));
    setGroups([]);
    setPairingIds([]);
  };

  const openEdit = (item) => {
    setSelected(item.id);
    setOpen(true);
    setForm(formFromItem(item));
    setGroups(groupsFromItem(item));
    setPairingIds(item.pairingIds ?? item.pairings?.map((pairing) => pairing.id) ?? []);
  };

  const closeEditor = () => {
    setSelected(null);
    setOpen(false);
    setForm(blankForm(categories));
    setGroups([]);
    setPairingIds([]);
  };

  const updateGroup = (index, patch) =>
    setGroups((prev) =>
      prev.map((group, groupIndex) =>
        groupIndex === index ? { ...group, ...patch } : group,
      ),
    );

  const updateOption = (groupIndex, optionIndex, patch) =>
    setGroups((prev) =>
      prev.map((group, index) =>
        index === groupIndex
          ? {
              ...group,
              options: group.options.map((option, optionIndexInner) =>
                optionIndexInner === optionIndex
                  ? { ...option, ...patch }
                  : option,
              ),
            }
          : group,
      ),
    );

  const addGroup = () =>
    setGroups((prev) => {
      const used = new Set(prev.map((group) => group.key));
      let index = prev.length;
      while (used.has(`group-${index + 1}`)) index += 1;
      return [...prev, blankGroup(index)];
    });
  const removeGroup = (index) =>
    setGroups((prev) => prev.filter((_, groupIndex) => groupIndex !== index));
  const addOption = (groupIndex) =>
    setGroups((prev) =>
      prev.map((group, index) => {
        if (index !== groupIndex) return group;
        const used = new Set(group.options.map((option) => option.value));
        let optionIndex = group.options.length;
        while (used.has(`option-${optionIndex + 1}`)) optionIndex += 1;
        return {
          ...group,
          options: [...group.options, blankOption(optionIndex)],
        };
      }),
    );
  const removeOption = (groupIndex, optionIndex) =>
    updateGroup(groupIndex, {
      options: groups[groupIndex].options.filter((_, index) => index !== optionIndex),
    });

  const togglePairing = (id) =>
    setPairingIds((prev) =>
      prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id],
    );

  const save = async (event) => {
    event.preventDefault();
    if (!form.name.trim()) return toast("Enter the dish name.", "error");
    if (!editing && !form.id.trim()) {
      // The server can derive a slug from the name, but asking for it here
      // makes the URL stable and explicit.
      toast("Add a slug for the dish URL.", "error");
      return;
    }

    const payload = {
      ...(form.id.trim() ? { id: form.id.trim() } : {}),
      name: form.name.trim(),
      nativeName: form.nativeName.trim(),
      tagline: form.tagline.trim(),
      description: form.description.trim(),
      longDescription: form.longDescription.trim(),
      category: form.category,
      priceCents: Math.round((Number(form.price) || 0) * 100),
      imageUrl: form.imageUrl.trim(),
      spiceLevel: form.spiceLevel.trim(),
      servings: form.servings.trim(),
      ingredients: splitList(form.ingredients),
      allergens: splitList(form.allergens),
      tags: splitList(form.tags),
      badgeText: form.badgeText.trim(),
      badgeTone: form.badgeTone,
      isSpecial: form.isSpecial,
      isActive: form.isActive,
      isFasting: form.isFasting,
      isComplimentary: form.isComplimentary,
      isSide: form.isSide,
      sortOrder: Number(form.sortOrder) || 0,
      optionGroups: groups.map((group, groupIndex) => ({
        key: group.key,
        title: group.title,
        icon: group.icon,
        badge: group.badge,
        columns: Number(group.columns) || 1,
        isMulti: Boolean(group.isMulti),
        maxSelections: Number(group.maxSelections) || 1,
        sortOrder: Number(group.sortOrder) || groupIndex,
        isActive: group.isActive !== false,
        options: group.options.map((option, optionIndex) => ({
          value: option.value,
          title: option.title,
          description: option.description,
          note: option.note,
          priceDeltaCents: Math.round((Number(option.priceDelta) || 0) * 100),
          isDefault: Boolean(option.isDefault),
          isActive: option.isActive !== false,
          sortOrder: Number(option.sortOrder) || optionIndex,
        })),
      })),
      pairingIds,
    };

    setSaving(true);
    try {
      const response = await fetch(
        editing ? `/api/admin/menu/${encodeURIComponent(selected)}` : "/api/admin/menu",
        {
          method: editing ? "PATCH" : "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.message ?? "The dish could not be saved.");
      toast(editing ? "Dish updated." : "Dish created.", "success");
      await mutate();
      closeEditor();
    } catch (saveError) {
      toast(saveError.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const retire = async (item) => {
    if (!window.confirm(`Retire ${item.name}? Historical orders keep their snapshot.`)) {
      return;
    }
    try {
      const response = await fetch(`/api/admin/menu/${encodeURIComponent(item.id)}`, {
        method: "DELETE",
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.message ?? "The dish could not be retired.");
      toast("Dish retired.", "success");
      await mutate();
      if (selected === item.id) closeEditor();
    } catch (retireError) {
      toast(retireError.message, "error");
    }
  };

  return (
    <section className="admin-menu">
      <div className="admin-toolbar">
        <div>
          <h2>Dish catalogue</h2>
          <p>
            {items.length} dishes · {items.filter((item) => item.isActive).length} live ·{" "}
            {items.filter((item) => item.isSpecial).length} specials
          </p>
        </div>
        <div className="admin-toolbar__actions">
          <Button variant="outline" size="sm" leftIcon={<FiRefreshCw />} onClick={() => mutate()} disabled={isValidating}>
            Refresh
          </Button>
          <Button size="sm" leftIcon={<FiPlus />} onClick={openNew}>
            New dish
          </Button>
        </div>
      </div>

      {error && (
        <p className="admin-notice admin-notice--error">
          {error.message ?? "The catalogue could not be loaded."}
        </p>
      )}

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Dish</th>
              <th>Category</th>
              <th>Price</th>
              <th>Flags</th>
              <th>Options</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className={item.isActive ? "" : "is-muted"}>
                <td>
                  <strong>{item.name}</strong>
                  <span className="admin-table__sub">{item.id}</span>
                  {item.rating?.count > 0 && (
                    <Stars value={item.rating.average} count={item.rating.count} />
                  )}
                </td>
                <td>{item.categoryLabel ?? item.category}</td>
                <td>ETB {Number(item.priceCents ?? 0) / 100}</td>
                <td>
                  <span className="admin-flaglist">
                    {item.isSpecial && <span className="admin-flag admin-flag--gold">Special</span>}
                    {item.isFasting && <span className="admin-flag admin-flag--green">Fasting</span>}
                    {item.isSide && <span className="admin-flag">Side</span>}
                    {item.isComplimentary && <span className="admin-flag">Complimentary</span>}
                    {!item.isActive && <span className="admin-flag admin-flag--muted">Retired</span>}
                  </span>
                </td>
                <td>{item.optionGroups?.length ?? 0} groups</td>
                <td>
                  <div className="admin-row-actions">
                    <Button variant="outline" size="sm" leftIcon={<FiEdit2 />} onClick={() => openEdit(item)}>
                      Edit
                    </Button>
                    {item.isActive && (
                      <Button variant="ghost" size="sm" leftIcon={<FiTrash2 />} onClick={() => retire(item)}>
                        Retire
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {open && (
        <form className="admin-editor" onSubmit={save}>
          <div className="admin-editor__head">
            <div>
              <p className="portal-eyebrow">{editing ? "Editing" : "New dish"}</p>
              <h2>{editing ? form.name || "Dish" : "Create a dish"}</h2>
            </div>
            <Button variant="ghost" size="sm" leftIcon={<FiX />} onClick={closeEditor}>
              Close
            </Button>
          </div>

          <fieldset className="admin-fieldset">
            <legend>Dish details</legend>
            <div className="admin-grid admin-grid--3">
              <Field label="Slug" hint="Lowercase, used in /dish/{slug}. Cannot change later.">
                <input
                  value={form.id}
                  onChange={(event) => set("id", event.target.value)}
                  placeholder="doro-wat"
                  disabled={editing}
                  required
                />
              </Field>
              <Field label="Name">
                <input value={form.name} onChange={(event) => set("name", event.target.value)} required />
              </Field>
              <Field label="Native name">
                <input value={form.nativeName} onChange={(event) => set("nativeName", event.target.value)} />
              </Field>
              <Field label="Category">
                <select value={form.category} onChange={(event) => set("category", event.target.value)}>
                  {categories.map((category) => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Price (ETB)">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={(event) => set("price", event.target.value)}
                  required
                />
              </Field>
              <Field label="Sort order">
                <input
                  type="number"
                  min="0"
                  value={form.sortOrder}
                  onChange={(event) => set("sortOrder", event.target.value)}
                />
              </Field>
              <Field label="Tagline" wide>
                <input value={form.tagline} onChange={(event) => set("tagline", event.target.value)} />
              </Field>
              <Field label="Card description" wide>
                <textarea rows={3} value={form.description} onChange={(event) => set("description", event.target.value)} />
              </Field>
              <Field label="Long description" wide>
                <textarea rows={5} value={form.longDescription} onChange={(event) => set("longDescription", event.target.value)} />
              </Field>
              <Field label="Image URL" wide hint="Use an https URL from a configured image host, such as images.unsplash.com.">
                <input value={form.imageUrl} onChange={(event) => set("imageUrl", event.target.value)} />
              </Field>
              <Field label="Spice / preparation">
                <input value={form.spiceLevel} onChange={(event) => set("spiceLevel", event.target.value)} />
              </Field>
              <Field label="Servings">
                <input value={form.servings} onChange={(event) => set("servings", event.target.value)} />
              </Field>
              <Field label="Badge text">
                <input value={form.badgeText} onChange={(event) => set("badgeText", event.target.value)} />
              </Field>
              <Field label="Badge tone">
                <select value={form.badgeTone} onChange={(event) => set("badgeTone", event.target.value)}>
                  <option value="brand">Brand</option>
                  <option value="gold">Gold</option>
                  <option value="green">Green</option>
                  <option value="dark">Dark</option>
                </select>
              </Field>
              <Field label="Ingredients" hint="Comma or newline separated." wide>
                <input value={form.ingredients} onChange={(event) => set("ingredients", event.target.value)} />
              </Field>
              <Field label="Allergens" hint="Comma separated." wide>
                <input value={form.allergens} onChange={(event) => set("allergens", event.target.value)} />
              </Field>
              <Field label="Tags" hint="Used by home filters, e.g. popular, fasting, side." wide>
                <input value={form.tags} onChange={(event) => set("tags", event.target.value)} />
              </Field>
            </div>
          </fieldset>

          <fieldset className="admin-fieldset">
            <legend>Availability & badges</legend>
            <div className="admin-checkgrid">
              {renderFlag("isActive", "Live on the menu")}
              {renderFlag("isSpecial", "Chef's special")}
              {renderFlag("isFasting", "Fasting / vegan")}
              {renderFlag("isSide", "Side dish")}
              {renderFlag("isComplimentary", "Complimentary side")}
            </div>
          </fieldset>

          <fieldset className="admin-fieldset">
            <legend>Order options</legend>
            <p className="admin-fieldset__note">
              These groups appear on the dish page. Price deltas are per selection
              and are charged by the server at checkout.
            </p>
            {groups.length === 0 && <p className="admin-empty">No option groups. The dish is added directly.</p>}
            {groups.map((group, groupIndex) => (
              <div className="admin-optiongroup" key={`${group.key}-${groupIndex}`}>
                <div className="admin-optiongroup__head">
                  <strong>Group {groupIndex + 1}</strong>
                  <Button variant="ghost" size="sm" leftIcon={<FiTrash2 />} onClick={() => removeGroup(groupIndex)}>
                    Remove group
                  </Button>
                </div>
                <div className="admin-grid admin-grid--3">
                  <Field label="Key">
                    <input value={group.key} onChange={(event) => updateGroup(groupIndex, { key: event.target.value })} />
                  </Field>
                  <Field label="Title">
                    <input value={group.title} onChange={(event) => updateGroup(groupIndex, { title: event.target.value })} />
                  </Field>
                  <Field label="Icon">
                    <input value={group.icon} onChange={(event) => updateGroup(groupIndex, { icon: event.target.value })} />
                  </Field>
                  <Field label="Badge">
                    <input value={group.badge} onChange={(event) => updateGroup(groupIndex, { badge: event.target.value })} />
                  </Field>
                  <Field label="Columns">
                    <input type="number" min="1" max="3" value={group.columns} onChange={(event) => updateGroup(groupIndex, { columns: event.target.value })} />
                  </Field>
                  <Field label="Max selections">
                    <input type="number" min="1" max="10" value={group.maxSelections} onChange={(event) => updateGroup(groupIndex, { maxSelections: event.target.value })} />
                  </Field>
                  <Field label="Sort order">
                    <input type="number" min="0" value={group.sortOrder} onChange={(event) => updateGroup(groupIndex, { sortOrder: event.target.value })} />
                  </Field>
                  <label className="admin-check">
                    <input type="checkbox" checked={Boolean(group.isMulti)} onChange={() => updateGroup(groupIndex, { isMulti: !group.isMulti, maxSelections: group.isMulti ? 1 : group.maxSelections })} />
                    <span><strong>Multiple selections</strong></span>
                  </label>
                </div>

                <div className="admin-options">
                  {group.options.map((option, optionIndex) => (
                    <div className="admin-optionrow" key={`${option.value}-${optionIndex}`}>
                      <input aria-label="Option value" placeholder="value" value={option.value} onChange={(event) => updateOption(groupIndex, optionIndex, { value: event.target.value })} />
                      <input aria-label="Option title" placeholder="Title" value={option.title} onChange={(event) => updateOption(groupIndex, optionIndex, { title: event.target.value })} />
                      <input aria-label="Option description" placeholder="Description" value={option.description} onChange={(event) => updateOption(groupIndex, optionIndex, { description: event.target.value })} />
                      <input aria-label="Option note" placeholder="Note" value={option.note} onChange={(event) => updateOption(groupIndex, optionIndex, { note: event.target.value })} />
                      <input aria-label="Price delta ETB" type="number" min="0" step="0.01" placeholder="+ETB" value={option.priceDelta} onChange={(event) => updateOption(groupIndex, optionIndex, { priceDelta: event.target.value })} />
                      <label className="admin-check admin-check--compact">
                        <input type="checkbox" checked={Boolean(option.isDefault)} onChange={() => updateOption(groupIndex, optionIndex, { isDefault: !option.isDefault })} />
                        <span>Default</span>
                      </label>
                      <Button variant="ghost" size="sm" leftIcon={<FiX />} onClick={() => removeOption(groupIndex, optionIndex)}>
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
                <Button variant="outline" size="sm" leftIcon={<FiPlus />} onClick={() => addOption(groupIndex)}>
                  Add choice
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" leftIcon={<FiPlus />} onClick={addGroup}>
              Add option group
            </Button>
          </fieldset>

          <fieldset className="admin-fieldset">
            <legend>Pairings</legend>
            <p className="admin-fieldset__note">Suggest these dishes alongside the main item.</p>
            <div className="admin-pairings">
              {items
                .filter((item) => item.id !== selected)
                .map((item) => (
                  <label className="admin-check" key={item.id}>
                    <input
                      type="checkbox"
                      checked={pairingIds.includes(item.id)}
                      onChange={() => togglePairing(item.id)}
                    />
                    <span>{item.name}</span>
                  </label>
                ))}
            </div>
          </fieldset>

          <div className="admin-editor__actions">
            <Button type="submit" leftIcon={<FiSave />} disabled={saving}>
              {saving ? "Saving…" : editing ? "Save changes" : "Create dish"}
            </Button>
            <Button variant="outline" onClick={closeEditor}>
              Cancel
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}
