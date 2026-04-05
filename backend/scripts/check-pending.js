require("dotenv").config();
const fs=require("fs"),path=require("path");
const c=JSON.parse(fs.readFileSync(path.join(__dirname,"config","database.json"),"utf8")).production;
const sql=require("mssql");
sql.connect({server:c.server,port:c.port||1433,database:c.database,user:c.user,password:c.password,options:{trustServerCertificate:true,encrypt:true}}).then(async pool=>{
  const t=await pool.request().query("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME LIKE '%issue%' OR TABLE_NAME LIKE '%finding%' OR TABLE_NAME LIKE '%rilievo%'");
  console.log("Tabelle trovate:", t.recordset.map(r=>r.TABLE_NAME).join(", ") || "nessuna");
  const cols=await pool.request().query("SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='pending_issues' ORDER BY ORDINAL_POSITION");
  console.log("pending_issues:", cols.recordset.map(r=>r.COLUMN_NAME+":"+r.DATA_TYPE).join(", "));
  await pool.close();
}).catch(e=>console.error(e.message));
