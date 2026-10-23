# WardFlow prototype

WardFlow is a responsive, static web prototype for the FactWise virus quarantine and treatment facility assessment. It demonstrates the Nurse, Doctor, and Admin workflows with sample data.

## Open it

Open `index.html` in a modern browser. No build step or server is needed for local review. Changes are saved in that browser's local storage. Use **Reset demo data** in the left sidebar to restore the original sample roster.

## Deploy it

The folder is a static site. To deploy it, import this folder into Vercel or Netlify and use the default static-site settings: no build command and the folder itself as the publish directory. `index.html` is the entry page. The app does not require environment variables or a backend.

## Demo workflows

- **Nurse:** open a patient with no reading today, record one temperature, then see the fever alert and doctor handoff state.
- **Doctor:** switch the role selector to Doctor. A visit is available only after a same-day nurse reading; log a daily visit, recommend a three-day-eligible patient to Admin, or record a confirmed death outcome.
- **Admin:** switch to Admin, open the discharge queue, and discharge a patient after the three completed fever-free days are present. The freed bed can then be used for a new admission.
- **Outcomes:** review recovered and mortality rates against the 85% and 15% benchmarks. The sample begins with 17 recovered and 3 deaths.

## Scope

This is a front-end demonstration with fabricated records. It stores changes only in the current browser and is not connected to a server, real facility, identity provider, or clinical record system. The 38.0°C threshold is a configurable demonstration default, not a clinical recommendation. Before any live use, the facility would need clinical validation, an approved threshold, secure authentication, access controls, audit storage, backups, privacy review, and integration with its actual patient records.
