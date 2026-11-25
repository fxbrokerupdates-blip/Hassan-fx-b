type Event={date:string;utc:string|null;currency:string;name:string;provider:string;url:string;impact:"High"|"Medium"};
export const bls="https://www.bls.gov/schedule/2026/12_sched_list.htm",bea="https://www.bea.gov/news/schedule",fed="https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm",ecb="https://www.ecb.europa.eu/press/calendars/mgcgc/html/index.en.html";
export const events:Event[]=[
 {date:"2026-11-25",utc:"2026-11-25T13:30:00Z",currency:"USD",name:"GDP — Q3 second estimate",provider:"BEA",url:bea,impact:"High"},
 {date:"2026-11-25",utc:"2026-11-25T13:30:00Z",currency:"USD",name:"Personal income and outlays — October",provider:"BEA",url:bea,impact:"High"},
 {date:"2026-12-01",utc:"2026-12-01T15:00:00Z",currency:"USD",name:"JOLTS — October",provider:"BLS",url:bls,impact:"High"},
 {date:"2026-12-04",utc:"2026-12-04T13:30:00Z",currency:"USD",name:"Employment situation — November (NFP)",provider:"BLS",url:bls,impact:"High"},
 {date:"2026-12-08",utc:"2026-12-08T13:30:00Z",currency:"USD",name:"Productivity and costs — Q3 revision",provider:"BLS",url:bls,impact:"Medium"},
 {date:"2026-12-08",utc:"2026-12-08T13:30:00Z",currency:"USD",name:"International trade — October",provider:"BEA",url:bea,impact:"Medium"},
 {date:"2026-12-09",utc:null,currency:"USD",name:"FOMC policy meeting — final day",provider:"Federal Reserve",url:fed,impact:"High"},
 {date:"2026-12-10",utc:"2026-12-10T13:30:00Z",currency:"USD",name:"CPI — November",provider:"BLS",url:bls,impact:"High"},
 {date:"2026-12-15",utc:"2026-12-15T13:30:00Z",currency:"USD",name:"PPI — November",provider:"BLS",url:bls,impact:"High"},
 {date:"2026-12-17",utc:null,currency:"EUR",name:"ECB monetary policy meeting — final day",provider:"ECB",url:ecb,impact:"High"},
 {date:"2026-12-17",utc:"2026-12-17T13:30:00Z",currency:"USD",name:"Import and export prices — November",provider:"BLS",url:bls,impact:"Medium"},
 {date:"2026-12-23",utc:"2026-12-23T13:30:00Z",currency:"USD",name:"GDP — Q3 third estimate",provider:"BEA",url:bea,impact:"High"},
 {date:"2026-12-23",utc:"2026-12-23T13:30:00Z",currency:"USD",name:"Personal income and outlays — November",provider:"BEA",url:bea,impact:"High"},
];
