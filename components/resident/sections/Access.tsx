"use client";

import React, { useState } from "react";

import { uploadResidentPhoto } from "@/lib/messages/upload-attachment";
import {
  createGuestPass, createVehicle, removeVehicle, revokeGuestPass,
} from "@/lib/resident-portal/request-actions";
import { useResident } from "@/lib/resident-portal/store";
import { recordPhotoUrl } from "@/lib/supabase/message-files";
import {
  AddDrawer, Card, CardHeadMeta as CardHead, ConfirmBar, Empty, ErrorLine, Field, FieldGrid,
  Input, Mono, PhotoPicker, Primary, RecordPhoto, Row, RowMain, TextButton,
} from "../ui";
import { color, font, pad } from "../ui";

export default function Access() {
  const s = useResident();

  const [rotatePending, setRotatePending] = useState(false);

  const [passOpen, setPassOpen] = useState(false);
  const [passError, setPassError] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestDates, setGuestDates] = useState("");
  const [guestPlate, setGuestPlate] = useState("");

  const [vehicleOpen, setVehicleOpen] = useState(false);
  const [vehicleError, setVehicleError] = useState("");
  const [vehicleDesc, setVehicleDesc] = useState("");
  const [vehiclePlate, setVehiclePlate] = useState("");
  const [vehiclePhoto, setVehiclePhoto] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  /* Both of these built a record in the browser and pushed it into React
     state. The gate had no way of knowing a pass existed, and the code the
     resident showed at the gate was invented by their own tab and gone on
     reload. They now write guest_passes and resident_vehicles. */
  async function issuePass() {
    if (busy) return;
    if (!guestName.trim() || !guestDates.trim())
      return setPassError("Add the guest's name and the dates they'll be here.");
    setBusy(true);
    setPassError("");
    const res = await createGuestPass({
      guestName, dates: guestDates, plate: guestPlate,
    });
    setBusy(false);
    if (!res.ok) return setPassError(res.error);
    s.setGuestPasses((prev) => [res.pass, ...prev]);
    setPassOpen(false);
    setGuestName(""); setGuestDates(""); setGuestPlate("");
  }

  async function revokePass(id: string) {
    if (busy) return;
    setBusy(true);
    const res = await revokeGuestPass(id);
    setBusy(false);
    if (!res.ok) return setPassError(res.error);
    s.setGuestPasses((prev) => prev.filter((x) => x.id !== id));
  }

  async function addVehicle() {
    if (busy) return;
    if (!vehicleDesc.trim() || !vehiclePlate.trim())
      return setVehicleError("Add the vehicle and its plate.");
    setBusy(true);
    setVehicleError("");
    let photoPath: string | undefined;
    if (vehiclePhoto) {
      const up = await uploadResidentPhoto(vehiclePhoto, "vehicles");
      if (up.ok) photoPath = up.path;
    }
    const res = await createVehicle({
      description: vehicleDesc, plate: vehiclePlate, photoPath,
    });
    setBusy(false);
    if (!res.ok) return setVehicleError(res.error);
    s.setVehicles((prev) => [res.vehicle, ...prev]);
    setVehicleOpen(false);
    setVehicleDesc(""); setVehiclePlate(""); setVehiclePhoto(null);
  }

  async function dropVehicle(id: string) {
    if (busy) return;
    setBusy(true);
    const res = await removeVehicle(id);
    setBusy(false);
    if (!res.ok) return setVehicleError(res.error);
    s.setVehicles((prev) => prev.filter((x) => x.id !== id));
  }

  return (
    <>

      {s.gateCodesAllowed ? (
      <Card>
        <CardHead title="Gate code" meta="For the resident lanes and pedestrian gates" />
        <div style={{ padding: pad.card, display: "flex", gap: 18, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
          {s.gateCode ? (
            <span style={{ fontFamily: font.mono, fontSize: 30, letterSpacing: "0.2em" }}>{s.gateCode}</span>
          ) : (
            <span style={{ fontSize: 15, lineHeight: 1.6, color: color.inkTertiary, flex: "1 1 320px" }}>
              No personal gate code is on file yet. Generate one and it works at
              every resident gate within the hour.
            </span>
          )}
          <TextButton onClick={() => setRotatePending(true)}>
            {s.gateCode ? "Regenerate code" : "Generate my code"}
          </TextButton>
        </div>
        {rotatePending ? (
          <ConfirmBar
            text={s.gateCode
              ? "Are you sure? Your current code stops working immediately, everywhere, including for anyone you've shared it with."
              : "Generate a personal gate code? It works at every resident gate within the hour."}
            confirmLabel={s.gateCode ? "Yes, replace it" : "Yes, generate it"}
            onCancel={() => setRotatePending(false)}
            onConfirm={() => {
              s.setGateCode(String(Math.floor(10000 + Math.random() * 89999)).split("").join(" "));
              setRotatePending(false);
            }}
          />
        ) : null}
      </Card>
      ) : null}

      {s.guestPassesAllowed ? (
      <Card>
        <AddDrawer
          open={passOpen}
          onOpen={() => { setPassOpen(true); setPassError(""); }}
          onCancel={() => { setPassOpen(false); setPassError(""); }}
          openLabel="Issue a guest pass"
          title="Issue a guest pass"
          count={s.guestPasses.length ? `${s.guestPasses.length} active` : undefined}
        >
          <FieldGrid>
            <Field label="Guest name"><Input value={guestName} onChange={setGuestName} placeholder="Who's visiting?" /></Field>
            <Field label="Dates"><Input value={guestDates} onChange={setGuestDates} placeholder="e.g. Apr 12–14, or standing" /></Field>
            <Field label="Vehicle plate" hint="Optional — speeds up the guest lane">
              <Input value={guestPlate} onChange={setGuestPlate} placeholder="e.g. TX 7PQ-4410" mono />
            </Field>
          </FieldGrid>
          {passError ? <ErrorLine>{passError}</ErrorLine> : null}
          <Primary onClick={issuePass} style={{ justifySelf: "start" }}>Issue pass</Primary>
        </AddDrawer>

        <CardHead title="Active guest passes" />
        {s.guestPasses.length === 0 ? (
          <Empty>No active passes. Issue one above and your guest checks in with the code at the gate.</Empty>
        ) : (
          s.guestPasses.map((g) => (
            <Row key={g.id}>
              <Mono size={13} style={{ color: color.neutral }}>{g.code}</Mono>
              <RowMain label={g.name} detail={g.detail} />
              <TextButton tone="destructive" onClick={() => revokePass(g.id)}>
                Revoke
              </TextButton>
            </Row>
          ))
        )}
      </Card>
      ) : null}

      <Card>
        <AddDrawer
          open={vehicleOpen}
          onOpen={() => { setVehicleOpen(true); setVehicleError(""); }}
          onCancel={() => { setVehicleOpen(false); setVehicleError(""); setVehiclePhoto(null); }}
          openLabel="Register a vehicle"
          title="Register a vehicle"
          count={s.vehicles.length ? `${s.vehicles.length} registered` : undefined}
        >
          <FieldGrid>
            <Field label="Vehicle"><Input value={vehicleDesc} onChange={setVehicleDesc} placeholder="e.g. 2021 Subaru Outback" /></Field>
            <Field label="Plate"><Input value={vehiclePlate} onChange={setVehiclePlate} placeholder="e.g. TX 4KJ-2210" mono /></Field>
          </FieldGrid>
          <PhotoPicker
            label="Vehicle photo"
            hint="Optional. A photo helps the gate match the car to the plate."
            file={vehiclePhoto}
            onChange={setVehiclePhoto}
            size={112}
          />
          {vehicleError ? <ErrorLine>{vehicleError}</ErrorLine> : null}
          <Primary onClick={addVehicle} style={{ justifySelf: "start" }}>Register</Primary>
        </AddDrawer>

        <CardHead title="Registered vehicles" />
        {s.vehicles.length === 0 ? (
          <Empty>No vehicles registered. Registered vehicles use the resident lanes without a code.</Empty>
        ) : (
          s.vehicles.map((v) => (
            <Row key={v.id} style={{ alignItems: "center" }}>
              {v.photoPath ? (
                <RecordPhoto href={recordPhotoUrl("vehicles", v.id)} alt={v.label} />
              ) : null}
              <RowMain label={v.label} />
              <Mono size={13} style={{ color: color.attention }}>{v.tag}</Mono>
              <TextButton tone="destructive" onClick={() => dropVehicle(v.id)}>
                Remove
              </TextButton>
            </Row>
          ))
        )}
      </Card>
    </>
  );
}
