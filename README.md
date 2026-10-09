# SBA loan dashboard

A dashboard of SBA 7(a) loans for looking at small-business acquisitions.

It opens on the entire United States. You can narrow the view by state, then county, then city. An acquisition is a loan the SBA marks as “Change of Ownership,” meaning the money was used to buy an existing business. Restaurants and food service (NAICS 722) and cancelled loans are left out. The figures run from FY2020 through the June 30, 2026 SBA file.

## Open it

Any of these opens the dashboard:

- https://vegas-sba-dashboard.vercel.app
- https://sba-acquisitions-dashboard.vercel.app
- https://kevinhoung.github.io/sba_loan_dashboard/

To leave a comment or open an issue, use the GitHub repo: https://github.com/kevinhoung/sba_loan_dashboard

## What you see

For the place you pick, the page shows loan counts, approved dollars, and how many of those loans were acquisitions. It also lists industries and lenders, with charge-off and distress columns. Those two terms are explained in the app under **Methodology & Sources**.

## On your computer

Open `index.html` in a browser. The page loads the state files in `data/loans/`, so the folder needs to be served as a website if the browser will not load those files on its own.

The checks already in the repo run with:

```
node --test test/*.test.js
```

## Data

The source is the SBA 7(a) FOIA file `FOIA_7a_FY2020_Present_asof_260630.csv`, covering FY2020 through June 30, 2026. That raw file is not in this repo. Do not commit secrets.
