# WardFlow care prototype

This is a small, responsive browser prototype for the quarantine-facility workflow in the FactWise TPM assessment. It has working nurse temperature entry, doctor review and discharge recommendation, admin admission and discharge, closed patient charts, and outcome-rate reporting.

## Open the prototype

1. Unzip or keep the `factwise-care-prototype` folder intact.
2. Open `index.html` in a modern browser.
3. Use **View as** in the top right to switch between the Nurse, Doctor, and Admin demo roles.

The prototype starts with synthetic records for eight individual patients plus 66 additional occupied beds represented as an aggregate, so the unit opens at 74/74 occupancy as described in the case. Leena Rao has three complete fever-free days and a doctor recommendation, ready for the admin discharge workflow.

## Demonstrate the main workflows

1. As **Nurse**, open a patient who has a temperature due, save a temperature and choose the facility fever assessment. A second reading on the same date asks for a recheck reason.
2. As **Doctor**, review a patient after today's temperature is recorded and save a treatment decision. Routine review is gated on today's reading; an urgent override asks for a reason and remains visible in the chart.
3. As **Admin**, open Leena Rao's chart and confirm discharge. Occupancy drops by one, the bed becomes available, and the closed chart remains in the roster.
4. As **Admin**, admit a synthetic patient into the open bed.
5. As **Doctor**, record a death outcome for an active demo patient to see the mortality alert update when the rate passes 15%.
6. Use **Reset demo data** to restore the starting state.

## Publish a working web link

The site is static: it has no build step and needs no package installation. To publish it on Vercel:

1. Put the complete `factwise-care-prototype` folder in a GitHub repository and push it.
2. Sign in to Vercel, choose **Add New Project**, and import that repository.
3. Set the framework preset to **Other**. Leave the build command blank and set the output directory to `.` (the folder containing `index.html`).
4. Deploy. Vercel will provide a public URL; open it once and try the workflows above.

For a quick alternative, Netlify's manual deploy lets you drag the whole folder onto its deploy page. A hosting account is needed to create the public URL. This workspace has no Vercel CLI or signed-in Vercel account, so the source is ready to deploy but no public link has been created here.

## Prototype limits

- All records are synthetic and stored in the current browser's `localStorage`. Different browsers or devices do not share updates.
- The role selector demonstrates permissions; it is not authentication or access control.
- Do not enter real patient data or use this for care. A live system needs secure authentication, a shared backend, audit controls, backups, privacy review, and clinical validation.
- The facility's fever threshold is not specified in the assessment. The demo asks the nurse to select the facility's fever assessment instead of hard-coding a clinical cutoff. A production version should use a clinician-approved, versioned threshold and configured facility timezone.
- The outcome dashboard uses recovered / (recovered + deaths) and deaths / (recovered + deaths), excludes active patients, and labels the current totals. The reporting period and treatment of transfers should be agreed with the clinical team before production.
