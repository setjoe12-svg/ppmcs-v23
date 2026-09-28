const express=require('express');const path=require('path');const fs=require('fs');const bcrypt=require('bcryptjs');const jwt=require('jsonwebtoken');const {Pool}=require('pg');
const app=express();app.use(express.json({limit:'10mb'}));
const pool=new Pool({connectionString:process.env.DATABASE_URL,ssl:process.env.DATABASE_URL?{rejectUnauthorized:false}:false});
const PORT=process.env.PORT||3000;const JWT_SECRET=process.env.JWT_SECRET||'CHANGE_ME_IN_PRODUCTION';
const schema=fs.readFileSync(path.join(__dirname,'schema.sql'),'utf8');
async function init(){await pool.query(schema);const u=await pool.query('SELECT id FROM users WHERE username=$1',['adewale.joseph']);if(!u.rowCount){const hash=await bcrypt.hash(process.env.PPMCS_SEED_PASSWORD||'PPMCS-Pilot-2026',10);await pool.query('INSERT INTO users(username,display_name,role,password_hash) VALUES($1,$2,$3,$4)',['adewale.joseph','Engr. Adewale Joseph','AGM Roads & Bridges',hash]);}const c=await pool.query('SELECT COUNT(*)::int n FROM projects');if(!c.rows[0].n){const projects=[['P001','Parcel E Roads Construction','Road Infrastructure','Adewale Joseph','2026-08-03','2027-01-02',4.20,1.90,60,52,2.184,4.60,'At Risk'],['P002','32 Units Silos Project','Silos / Industrial','Silo Project Manager','2026-07-01','2027-02-15',4.20,1.90,50,38,1.596,4.20,'At Risk'],['P003','Cold Store','Cold Store / Building','Building Lead','2026-06-01','2026-12-15',2.80,1.10,45,40,1.12,2.75,'On Track'],['P004','Internal Roads (A)','Civil Works','Roads Lead','2026-08-01','2026-11-30',1.20,.82,70,68,.816,1.15,'On Track'],['P005','Utilities & Services','MEP / Utilities','Utilities Lead','2026-07-15','2027-01-31',1.00,.42,55,32,.32,1.10,'At Risk'],['P006','Perimeter & Access','Civil Works','Civil Lead','2026-08-15','2026-12-01',.80,.38,50,48,.384,.78,'On Track'],['P007','Warehousing','Buildings','Building Lead','2026-09-01','2027-02-28',.90,.22,35,20,.18,1.05,'Critical'],['P008','Site Wide Infrastructure','Infrastructure','Infrastructure Lead','2026-09-01','2027-03-01',.60,.15,25,12,.072,.72,'Critical']];for(const p of projects){await pool.query(`INSERT INTO projects(id,name,sector,manager,start_date,finish_date,budget,actual_cost,planned_pct,actual_pct,earned_value,forecast_cost,status) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,p)}const acts=[['P001','1.0','Preliminaries',.05,100,100,null,null,'%'],['P001','2.0','Earthworks',.15,92,87,50000,42500,'m3'],['P001','3.0','Drainage',.15,70,64,1200,980,'m'],['P001','4.0','Sub-base',.10,60,51,18000,14600,'m2'],['P001','5.0','Base Course',.10,40,38,12500,9800,'m2'],['P001','6.0','RC Pavement',.35,20,18,12500,9800,'m2'],['P001','7.0','Walkways & Lighting',.10,15,11,6500,4500,'m']];for(const a of acts)await pool.query('INSERT INTO wbs_activities(project_id,wbs_code,activity_name,weight,planned_pct,actual_pct,planned_qty,actual_qty,unit,status) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',[...a,a[5]>=a[4]?'On Track':'At Risk']);}}
async function auth(req,res,next){try{const h=req.headers.authorization||'';if(!h.startsWith('Bearer '))return res.status(401).json({error:'Unauthorized'});req.user=jwt.verify(h.slice(7),JWT_SECRET);next()}catch(e){res.status(401).json({error:'Unauthorized'})}}
app.get('/api/health',async(req,res)=>{try{await pool.query('SELECT 1');res.json({ok:true,service:'PPMCS API',database:'connected',version:'2.5.1'})}catch(e){res.status(503).json({ok:false,error:'Database unavailable'})}});
app.post('/api/auth/login',async(req,res)=>{const {username,password}=req.body||{};const q=await pool.query('SELECT * FROM users WHERE username=$1 AND active=true',[username]);if(!q.rowCount||!(await bcrypt.compare(password||'',q.rows[0].password_hash)))return res.status(401).json({error:'Invalid username or password'});const u=q.rows[0];const token=jwt.sign({id:u.id,username:u.username,role:u.role},JWT_SECRET,{expiresIn:'12h'});res.json({token,user:{username:u.username,displayName:u.display_name,role:u.role}})});
app.get('/api/portfolio',auth,async(req,res)=>{const p=await pool.query('SELECT * FROM projects ORDER BY id');const r=await pool.query('SELECT * FROM project_risks ORDER BY due_date NULLS LAST');res.json({projects:p.rows,risks:r.rows})});
app.get('/api/projects/:id',auth,async(req,res)=>{const p=await pool.query('SELECT * FROM projects WHERE id=$1',[req.params.id]);if(!p.rowCount)return res.status(404).json({error:'Project not found'});const [w,r,d,ph]=await Promise.all([pool.query('SELECT * FROM wbs_activities WHERE project_id=$1 ORDER BY wbs_code',[req.params.id]),pool.query('SELECT * FROM project_risks WHERE project_id=$1 ORDER BY due_date',[req.params.id]),pool.query('SELECT id,project_id,report_date,location,activity,planned_qty,actual_qty,unit,manpower,equipment,weather,remarks,created_at FROM daily_reports WHERE project_id=$1 ORDER BY report_date DESC,created_at DESC LIMIT 20',[req.params.id]),pool.query('SELECT id,project_id,activity_chainage,description,captured_at,image_data FROM project_photos WHERE project_id=$1 ORDER BY captured_at DESC LIMIT 12',[req.params.id])]);res.json({project:p.rows[0],wbs:w.rows,risks:r.rows,dailyReports:d.rows,photos:ph.rows})});
app.post('/api/daily-reports',auth,async(req,res)=>{
  try{
    const x=req.body||{};
    if(!x.projectId||!x.date||!x.activity)return res.status(400).json({error:'projectId, date and activity are required'});
    const q=await pool.query(`INSERT INTO daily_reports(project_id,report_date,location,activity,planned_qty,actual_qty,unit,manpower,equipment,weather,remarks,created_by)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [x.projectId,x.date,x.location||'',x.activity,x.plannedQty||0,x.actualQty||0,x.unit||'',x.manpower||'',x.equipment||'',x.weather||'',x.remarks||'',req.user.id]);
    await pool.query('INSERT INTO audit_log(user_id,action,entity_type,entity_id,metadata) VALUES($1,$2,$3,$4,$5)',
      [req.user.id,'CREATE','daily_report',String(q.rows[0].id),JSON.stringify({projectId:x.projectId})]);
    res.status(201).json(q.rows[0]);
  }catch(e){console.error('daily report error',e);res.status(500).json({error:'Unable to save daily report'})}
});
app.post('/api/reports/bulk',auth,async(req,res)=>{
  const items=Array.isArray(req.body?.items)?req.body.items:[];
  const results=[]; const client=await pool.connect();
  try{
    await client.query('BEGIN');
    for(const item of items){
      if(item.type!=='daily') continue;
      const x=item.payload||item;
      if(!x.projectId||!x.date||!x.activity) throw new Error('Invalid daily report payload');
      const q=await client.query(`INSERT INTO daily_reports(project_id,report_date,location,activity,planned_qty,actual_qty,unit,manpower,equipment,weather,remarks,created_by)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
        [x.projectId,x.date,x.location||'',x.activity,x.plannedQty||0,x.actualQty||0,x.unit||'',x.manpower||'',x.equipment||'',x.weather||'',x.remarks||'',req.user.id]);
      results.push({queueId:item.id,type:'daily',serverId:q.rows[0].id});
      await client.query('INSERT INTO audit_log(user_id,action,entity_type,entity_id,metadata) VALUES($1,$2,$3,$4,$5)',
        [req.user.id,'CREATE','daily_report',String(q.rows[0].id),JSON.stringify({source:'sync',queueId:item.id,projectId:x.projectId})]);
    }
    await client.query('COMMIT');
    res.json({ok:true,uploaded:results.length,results});
  }catch(e){
    await client.query('ROLLBACK');
    console.error('bulk sync error',e);
    res.status(400).json({ok:false,error:e.message||'Bulk sync failed'});
  }finally{client.release()}
});
app.post('/api/photos',auth,async(req,res)=>{
  try{
    const x=req.body||{};
    if(!x.projectId||!x.imageData)return res.status(400).json({error:'projectId and imageData are required'});
    const q=await pool.query(`INSERT INTO project_photos(project_id,activity_chainage,description,captured_at,image_data,created_by)
      VALUES($1,$2,$3,$4,$5,$6) RETURNING id,project_id,activity_chainage,description,captured_at`,
      [x.projectId,x.chainage||'',x.description||'Progress photograph',x.capturedAt||new Date().toISOString(),x.imageData,req.user.id]);
    await pool.query('INSERT INTO audit_log(user_id,action,entity_type,entity_id,metadata) VALUES($1,$2,$3,$4,$5)',
      [req.user.id,'CREATE','project_photo',String(q.rows[0].id),JSON.stringify({projectId:x.projectId})]);
    res.status(201).json(q.rows[0]);
  }catch(e){console.error('photo error',e);res.status(500).json({error:'Unable to save project photograph'})}
});
app.get('/api/photos',auth,async(req,res)=>{
  try{
    const q=await pool.query(`SELECT id,project_id,activity_chainage,description,captured_at,image_data FROM project_photos
      WHERE ($1::varchar IS NULL OR project_id=$1) ORDER BY captured_at DESC LIMIT 100`,[req.query.projectId||null]);
    res.json({photos:q.rows});
  }catch(e){res.status(500).json({error:'Unable to load photographs'})}
});

// ===== PPMCS v2.6: Steps 4-7 API =====
app.get('/api/projects/:id/technical',auth,async(req,res)=>{
  try{
    const id=req.params.id;
    const [qa,ncr,hse,cost,actions]=await Promise.all([
      pool.query('SELECT * FROM qa_inspections WHERE project_id=$1 ORDER BY inspection_date DESC,id DESC LIMIT 100',[id]),
      pool.query('SELECT * FROM ncrs WHERE project_id=$1 ORDER BY created_at DESC LIMIT 100',[id]),
      pool.query('SELECT * FROM hse_events WHERE project_id=$1 ORDER BY event_date DESC,id DESC LIMIT 100',[id]),
      pool.query('SELECT * FROM cost_transactions WHERE project_id=$1 ORDER BY txn_date DESC,id DESC LIMIT 100',[id]),
      pool.query('SELECT * FROM management_actions WHERE project_id=$1 ORDER BY due_date NULLS LAST,id DESC LIMIT 100',[id])
    ]);
    res.json({qa:qa.rows,ncr:ncr.rows,hse:hse.rows,cost:cost.rows,actions:actions.rows});
  }catch(e){console.error(e);res.status(500).json({error:'Unable to load technical controls'})}
});
app.post('/api/qa-inspections',auth,async(req,res)=>{
  try{const x=req.body||{}; const q=await pool.query(`INSERT INTO qa_inspections(project_id,inspection_date,location,activity,inspector,result,test_type,remarks,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [x.projectId,x.date,x.location||'',x.activity||'',x.inspector||req.user.username,x.result||'Pending',x.testType||'',x.remarks||'',req.user.id]);
    res.status(201).json(q.rows[0]);
  }catch(e){res.status(400).json({error:e.message})}
});
app.post('/api/ncrs',auth,async(req,res)=>{
  try{const x=req.body||{}, id=x.id||('NCR-'+Date.now());const q=await pool.query(`INSERT INTO ncrs(id,project_id,title,severity,status,due_date,owner,corrective_action) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [id,x.projectId,x.title,x.severity||'Medium',x.status||'Open',x.dueDate||null,x.owner||'',x.correctiveAction||'']);res.status(201).json(q.rows[0]);
  }catch(e){res.status(400).json({error:e.message})}
});
app.post('/api/hse-events',auth,async(req,res)=>{
  try{const x=req.body||{};const q=await pool.query(`INSERT INTO hse_events(project_id,event_date,event_type,severity,location,description,status,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [x.projectId,x.date,x.type||'Observation',x.severity||'Low',x.location||'',x.description||'',x.status||'Open',req.user.id]);res.status(201).json(q.rows[0]);
  }catch(e){res.status(400).json({error:e.message})}
});
app.post('/api/cost-transactions',auth,async(req,res)=>{
  try{const x=req.body||{};const q=await pool.query(`INSERT INTO cost_transactions(project_id,txn_date,category,description,committed,actual,created_by) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [x.projectId,x.date,x.category||'Other',x.description||'',x.committed||0,x.actual||0,req.user.id]);res.status(201).json(q.rows[0]);
  }catch(e){res.status(400).json({error:e.message})}
});
app.post('/api/actions',auth,async(req,res)=>{
  try{const x=req.body||{};const q=await pool.query(`INSERT INTO management_actions(project_id,action,owner,due_date,priority,status) VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,
    [x.projectId,x.action,x.owner||'',x.dueDate||null,x.priority||'Medium',x.status||'Open']);res.status(201).json(q.rows[0]);
  }catch(e){res.status(400).json({error:e.message})}
});
app.get('/api/audit',auth,async(req,res)=>{
  try{const q=await pool.query('SELECT a.*,u.display_name FROM audit_log a LEFT JOIN users u ON u.id=a.user_id ORDER BY a.created_at DESC LIMIT 200');res.json({audit:q.rows})}
  catch(e){res.status(500).json({error:'Unable to load audit trail'})}
});
app.get('/api/admin/users',auth,async(req,res)=>{
  try{if(!['Administrator','AGM Roads & Bridges','Project Director'].includes(req.user.role))return res.status(403).json({error:'Forbidden'});const q=await pool.query('SELECT id,username,display_name,role,active,created_at FROM users ORDER BY display_name');res.json({users:q.rows})}
  catch(e){res.status(500).json({error:'Unable to load users'})}
});
app.get('/api/reports/executive',auth,async(req,res)=>{
  try{
    const p=await pool.query(`SELECT p.*,
      COALESCE((SELECT SUM(actual) FROM cost_transactions c WHERE c.project_id=p.id),0) AS tx_actual,
      COALESCE((SELECT SUM(committed) FROM cost_transactions c WHERE c.project_id=p.id),0) AS tx_committed,
      COALESCE((SELECT COUNT(*) FROM ncrs n WHERE n.project_id=p.id AND n.status NOT IN ('Closed','Resolved')),0) AS open_ncr,
      COALESCE((SELECT COUNT(*) FROM project_risks r WHERE r.project_id=p.id AND r.status NOT IN ('Closed','Resolved')),0) AS open_risks,
      COALESCE((SELECT COUNT(*) FROM management_actions a WHERE a.project_id=p.id AND a.status NOT IN ('Closed','Completed')),0) AS open_actions
      FROM projects p ORDER BY p.id`);
    const totals=p.rows.reduce((a,x)=>{a.budget+=+x.budget||0;a.actualCost+=+x.actual_cost||0;a.ev+=+x.earned_value||0;a.planned+=+x.planned_pct||0;a.actual+=+x.actual_pct||0;return a},{budget:0,actualCost:0,ev:0,planned:0,actual:0});
    res.json({generatedAt:new Date().toISOString(),projects:p.rows,totals});
  }catch(e){res.status(500).json({error:'Unable to generate executive report'})}
});
app.use(express.static(__dirname));app.get('*',(req,res)=>res.sendFile(path.join(__dirname,'index.html')));init().then(()=>app.listen(PORT,()=>console.log(`PPMCS running on ${PORT}`))).catch(e=>{console.error(e);process.exit(1)});
