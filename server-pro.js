const express=require('express');
const path=require('path');
const fs=require('fs');
const multer=require('multer');
const {Pool}=require('pg');
const bcrypt=require('bcryptjs');
const jwt=require('jsonwebtoken');
const cors=require('cors');
require('dotenv').config();
const app=express();
const PORT=process.env.PORT||8080;
const JWT_SECRET=process.env.JWT_SECRET||'CHANGE_THIS_SECRET_IN_PRODUCTION';
const DATABASE_URL=process.env.DATABASE_URL||'postgres://ppmcs:ppmcs@localhost:5432/ppmcs';
const UPLOAD_DIR=process.env.UPLOAD_DIR||path.join(__dirname,'uploads');
fs.mkdirSync(UPLOAD_DIR,{recursive:true});
const pool=new Pool({connectionString:DATABASE_URL,ssl:process.env.PGSSL==='true'?{rejectUnauthorized:false}:false});
app.use(cors()); app.use(express.json({limit:'2mb'})); app.use(express.urlencoded({extended:true}));
const upload=multer({dest:UPLOAD_DIR,limits:{fileSize:15*1024*1024}});
const PROJECTS=[
['P001','10,000 sqm Project','Foundation / Ground Floor'],['P002','32 units Silos Project','Foundation / Wall Level'],['P003','Parcel E Roads Construction','Setting Out / Mobilisation'],['P004','Construction of Gbadamosi Alo Road at Abidjo','Earthworks / Drainage'],['P005','Construction of Culvert along Road to Parcel D','Setting Out / River Diversion'],['P006','84m Sheet Pilling Works','Pre-construction / Site Preparation'],['P007','550m Truck Restraint Crash Barrier at Parking Level 1','Foundation / Formwork'],['P008','Igbodu Road Infrastructure Project','Mobilisation / Grading']
];
async function init(){
 await pool.query(`CREATE TABLE IF NOT EXISTS users(id UUID PRIMARY KEY DEFAULT gen_random_uuid(),name TEXT NOT NULL,email TEXT UNIQUE NOT NULL,password_hash TEXT NOT NULL,role TEXT NOT NULL DEFAULT 'field_engineer',active BOOLEAN DEFAULT TRUE,created_at TIMESTAMPTZ DEFAULT now());
 CREATE TABLE IF NOT EXISTS projects(id TEXT PRIMARY KEY,name TEXT NOT NULL,stage TEXT,planned NUMERIC DEFAULT 0,actual NUMERIC DEFAULT 0,status TEXT DEFAULT 'At Risk',target TEXT,actual_qty NUMERIC DEFAULT 0,unit TEXT,planned_rate TEXT,next_action TEXT,updated_at TIMESTAMPTZ DEFAULT now());
 CREATE TABLE IF NOT EXISTS reports(id TEXT PRIMARY KEY,project_id TEXT REFERENCES projects(id),user_id UUID REFERENCES users(id),report_date DATE NOT NULL,location TEXT,activity TEXT,pqty NUMERIC DEFAULT 0,qty NUMERIC DEFAULT 0,unit TEXT,manpower TEXT,equipment TEXT,weather TEXT,remarks TEXT,created_at TIMESTAMPTZ DEFAULT now());
 CREATE TABLE IF NOT EXISTS photos(id TEXT PRIMARY KEY,project_id TEXT REFERENCES projects(id),report_id TEXT,user_id UUID REFERENCES users(id),file_path TEXT NOT NULL,original_name TEXT,caption TEXT,location TEXT,created_at TIMESTAMPTZ DEFAULT now());
 CREATE TABLE IF NOT EXISTS audit_log(id BIGSERIAL PRIMARY KEY,user_id UUID,action TEXT,entity TEXT,entity_id TEXT,details JSONB,created_at TIMESTAMPTZ DEFAULT now());`);
 for(const [id,name,stage] of PROJECTS) await pool.query(`INSERT INTO projects(id,name,stage) VALUES($1,$2,$3) ON CONFLICT(id) DO NOTHING`,[id,name,stage]);
 const email=process.env.ADMIN_EMAIL||'admin@ppmcs.local'; const pass=process.env.ADMIN_PASSWORD||'ChangeMe123!';
 const hash=await bcrypt.hash(pass,12); await pool.query(`INSERT INTO users(name,email,password_hash,role) VALUES('PPMCS Administrator',$1,$2,'admin') ON CONFLICT(email) DO NOTHING`,[email,hash]);
}
function auth(req,res,next){const h=req.headers.authorization||''; if(!h.startsWith('Bearer ')) return res.status(401).json({error:'Authentication required'}); try{req.user=jwt.verify(h.slice(7),JWT_SECRET);next()}catch(e){res.status(401).json({error:'Invalid or expired token'})}}
function role(...roles){return (req,res,next)=>roles.includes(req.user.role)?next():res.status(403).json({error:'Insufficient role'});}
app.get('/api/health',async(req,res)=>{try{await pool.query('SELECT 1');res.json({ok:true,version:'2.3',database:'postgresql',time:new Date().toISOString()})}catch(e){res.status(503).json({ok:false,error:e.message})}});
app.post('/api/auth/login',async(req,res)=>{const {email,password}=req.body||{};const r=await pool.query('SELECT id,name,email,password_hash,role,active FROM users WHERE lower(email)=lower($1)',[email||'']);const u=r.rows[0];if(!u||!u.active||!(await bcrypt.compare(password||'',u.password_hash)))return res.status(401).json({error:'Invalid credentials'});const token=jwt.sign({id:u.id,name:u.name,email:u.email,role:u.role},JWT_SECRET,{expiresIn:'12h'});res.json({token,user:{id:u.id,name:u.name,email:u.email,role:u.role}})});
app.get('/api/me',auth,(req,res)=>res.json(req.user));
app.get('/api/projects',auth,async(req,res)=>res.json((await pool.query('SELECT * FROM projects ORDER BY id')).rows));
app.get('/api/state',auth,async(req,res)=>{const p=(await pool.query('SELECT * FROM projects ORDER BY id')).rows;const e=(await pool.query('SELECT id,project_id,report_date,location,activity,pqty,qty,unit,manpower,equipment,weather,remarks,user_id,created_at FROM reports ORDER BY created_at DESC LIMIT 500')).rows;const pc=(await pool.query('SELECT count(*)::int count FROM photos')).rows[0].count;res.json({version:'2.3',updatedAt:new Date().toISOString(),projects:p,entries:e,photoCount:pc})});
app.post('/api/reports/bulk',auth,async(req,res)=>{const reports=Array.isArray(req.body.reports)?req.body.reports:[];let count=0;for(const e of reports){await pool.query(`INSERT INTO reports(id,project_id,user_id,report_date,location,activity,pqty,qty,unit,manpower,equipment,weather,remarks) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) ON CONFLICT(id) DO NOTHING`,[e.id,e.project,e.user_id||req.user.id,e.date,e.location||'',e.activity||'',e.pqty||0,e.qty||0,e.unit||'',e.manpower||'',e.equipment||'',e.weather||'',e.remarks||'']);count++;}await pool.query('INSERT INTO audit_log(user_id,action,entity,details) VALUES($1,$2,$3,$4)',[req.user.id,'bulk_report_upload','reports',JSON.stringify({count})]);res.json({ok:true,count})});
app.post('/api/photos',auth,upload.single('file'),async(req,res)=>{let filePath,originalName; if(req.file){filePath=req.file.path;originalName=req.file.originalname;} else if(req.body.data){const m=String(req.body.data).match(/^data:([^;]+);base64,(.+)$/); if(!m)return res.status(400).json({error:'invalid data URI'}); const ext=(m[1].split('/')[1]||'jpg').replace(/[^a-z0-9]/gi,''); const id=req.body.id||Date.now().toString(); filePath=path.join(UPLOAD_DIR,id+'.'+ext); fs.writeFileSync(filePath,Buffer.from(m[2],'base64')); originalName=req.body.name||id+'.'+ext;} else return res.status(400).json({error:'file or data required'}); const id=req.body.id||path.basename(filePath); await pool.query(`INSERT INTO photos(id,project_id,report_id,user_id,file_path,original_name,caption,location) VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(id) DO NOTHING`,[id,req.body.project,req.body.report_id||null,req.user.id,filePath,originalName,req.body.caption||'',req.body.location||'']); res.json({ok:true,id})});
app.get('/api/admin/users',auth,role('admin'),async(req,res)=>res.json((await pool.query('SELECT id,name,email,role,active,created_at FROM users ORDER BY created_at')).rows));
app.post('/api/admin/users',auth,role('admin'),async(req,res)=>{const {name,email,password,role='field_engineer'}=req.body;const hash=await bcrypt.hash(password,12);const r=await pool.query('INSERT INTO users(name,email,password_hash,role) VALUES($1,$2,$3,$4) RETURNING id,name,email,role',[name,email,hash,role]);res.json(r.rows[0])});
app.get('/api/admin/export',auth,role('admin'),async(req,res)=>{const data={projects:(await pool.query('SELECT * FROM projects')).rows,reports:(await pool.query('SELECT * FROM reports')).rows,photos:(await pool.query('SELECT id,project_id,report_id,user_id,original_name,caption,location,created_at FROM photos')).rows};res.json(data)});
app.use(express.static(__dirname));
init().then(()=>app.listen(PORT,()=>console.log(`PPMCS v2.3 running on ${PORT}`))).catch(e=>{console.error(e);process.exit(1)});
