# PPMCS Pilot v2

Colourful standalone mobile-first prototype based on the approved PPMCS dashboard visual direction.

## Included
- Portfolio dashboard
- Project register
- Programme/WBS placeholder
- Daily progress entry
- Progress picture capture/upload
- Weather module
- Weekly/monthly performance views
- S-Curve & EVM placeholder
- Reports / CSV export
- Issues & Risks
- Offline-first PWA behavior

## Pilot use
Open `index.html` through a local/static web server or HTTPS host, then choose **Install App / Add to Home Screen** in a supported browser.

## Production roadmap
Authentication and roles; secure cloud database; live weather API; cloud photo storage; GPS/project coordinates; P6/MSP baseline import; weighted progress engine; S-curve; SPI/CPI/EVM; audit trail; approvals; management web portal; Android/iOS packaging; Windows desktop packaging.


## PPMCS v2.3 update

- Added a sign-in screen for the pilot deployment.
- Updated dashboard identity to **Engr. Adewale Joseph — Assistant General Manager – Roads & Bridges**.
- Added sign-out and session handling for the pilot browser session.
- The current login is **pilot/client-side authentication only**. It is not suitable for production security because credentials are contained in the static application. Before external/organizational release, replace it with server-side authentication connected to PostgreSQL/identity provider.
- Pilot username: `adewale.joseph`
- Pilot password: `PPMCS-Pilot-2026`

### Deployment
Upload the contents of this folder to the existing Render web service and deploy. No database recreation is required for this UI update.
