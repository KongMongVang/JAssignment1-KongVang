// IMPORT REQUIRED MODULES
import express from "express";
import path from "path";
import cors from "cors";

import { MongoClient, ObjectId } from "mongodb";

// CONNECT TO THE DATABASE
const dbUrl = "mongodb+srv://testdbuser:pu0iPbP2gwACK4sp@cluster0.5ln9opm.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const db = new MongoClient(dbUrl).db("portfoliodb"); // Connect to the portfoliodb database

const __dirname = import.meta.dirname; // Current app root directory

const app = express(); // Create Express app
const port = process.env.PORT || "8888"; // Port for server to listen on

// SET UP TEMPLATES IN EXPRESS APP
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");

// SET UP STATIC FILES
app.use(express.static(path.join(__dirname, "public")));

// ENABLE FORM DATA AND JSON PARSING
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors());

// HOME PAGE ROUTE
app.get("/", async (request, response) => {
  let links = await getLinks();
  response.render("index", { title: "Home", menu: links });
});

// ABOUT PAGE ROUTE
app.get("/about", async (request, response) => {
  let links = await getLinks();
  response.render("about", { title: "About", menu: links });
});

// ADMIN PROJECTS AND SKILLS PAGES
app.get("/admin/projects", async (request, response) => {
  let links = await getLinks();
  let projects = await getProjects();
  response.render("project-list", { title: "Administer project links", menu: links, projects: projects });
});

app.get("/admin/skills", async (request, response) => {
  let links = await getLinks();
  let skills = await getSkills();
  response.render("skill-list", { title: "Administer skill links", menu: links, skills: skills });
});

// ADD PROJECT/SKILL PAGES
app.get("/admin/projects/add", async (request, response) => {
  let links = await getLinks();
  let projects = await getProjects();
  response.render("project-add", { title: "Add projects link", menu: links, projects: projects });
});

app.get("/admin/skills/add", async (request, response) => {
  let links = await getLinks();
  let skills = await getSkills();
  response.render("skill-add", { title: "Add skills link", menu: links, skills: skills });
});

// HANDLE SUBMITTING NEW PROJECT/SKILL
app.post("/admin/projects/add/submit", async (request, response) => {
  let newProject = {
    path: request.body.path,
    name: request.body.name,
    description: request.body.description,
    repo: request.body.repo
  };
  await addProject(newProject); // Insert new project into DB
  response.redirect("/admin/projects"); // Redirect back to project list
});

app.post("/admin/skills/add/submit", async (request, response) => {
  let newSkill = {
    language: request.body.language,
    name: request.body.name,
    experience: request.body.experience,
    proficiency: request.body.proficiency
  };
  await addSkill(newSkill); // Insert new skill into DB
  response.redirect("/admin/skills");
});

// DELETE PROJECT/SKILL
app.get("/admin/projects/delete", async (request, response) => {
  let id = request.query.linkId;
  await deleteProject(id);
  response.redirect("/admin/projects");
});

app.get("/admin/skills/delete", async (request, response) => {
  let id = request.query.linkId;
  await deleteSkill(id);
  response.redirect("/admin/skills");
});

// EDIT PROJECT/SKILL PAGES
app.get("/admin/projects/edit", async (request, response) => {
  let linkId = request.query.linkId;
  if (!linkId) response.redirect("/admin/projects"); // Redirect if no ID
  let link = await db.collection("projects").findOne({ _id: new ObjectId(String(linkId)) }); // Get project by ID
  let links = await getLinks();
  response.render("project-edit", { title: "Edit project link", menu: links, editProject: link });
});

app.get("/admin/skills/edit", async (request, response) => {
  let linkId = request.query.linkId;
  if (!linkId) response.redirect("/admin/skills");
  let link = await db.collection("skills").findOne({ _id: new ObjectId(String(linkId)) }); // Get skill by ID
  let links = await getLinks();
  response.render("skill-edit", { title: "Edit skill link", menu: links, editSkill: link });
});

// HANDLE SUBMITTING EDITED PROJECT/SKILL
app.post("/admin/projects/edit/submit", async (req, res) => {
  const linkId = req.body.linkId;
  const updatedData = {
    name: req.body.name,
    description: req.body.description,
    path: req.body.path,
    repo: req.body.repo
  };
  await db.collection("projects").updateOne({ _id: new ObjectId(linkId) }, { $set: updatedData });
  res.redirect("/admin/projects");
});

app.post("/admin/skills/edit/submit", async (req, res) => {
  const linkId = req.body.linkId;
  const updatedData = {
    name: req.body.name,
    experience: req.body.experience,
    language: req.body.language,
    proficiency: req.body.proficiency
  };
  await db.collection("skills").updateOne({ _id: new ObjectId(linkId) }, { $set: updatedData });
  res.redirect("/admin/skills");
});

// API ENDPOINTS FOR PROJECTS
app.get("/api/projects", async (req, res) => {
  const projects = await getProjects();
  res.json(projects);
});

app.get("/api/projects/:id", async (req, res) => {
  const id = req.params.id;
  const project = await db.collection("projects").findOne({ _id: new ObjectId(id) });
  if (!project) return res.status(404).json({ error: "Project not found" });
  res.json(project);
});

app.post("/api/projects", async (req, res) => {
  const newProject = req.body;
  const result = await db.collection("projects").insertOne(newProject);
  res.status(201).json({ _id: result.insertedId, ...newProject });
});

app.put("/api/projects/:id", async (req, res) => {
  const id = req.params.id;
  const updatedData = req.body;
  const result = await db.collection("projects").updateOne({ _id: new ObjectId(id) }, { $set: updatedData });
  if (result.matchedCount === 0) return res.status(404).json({ error: "Project not found" });
  res.json({ message: "Project updated" });
});

app.delete("/api/projects/:id", async (req, res) => {
  const id = req.params.id;
  const result = await db.collection("projects").deleteOne({ _id: new ObjectId(id) });
  if (result.deletedCount === 0) return res.status(404).json({ error: "Project not found" });
  res.json({ message: "Project deleted" });
});

// API ENDPOINTS FOR SKILLS
app.get("/api/skills", async (req, res) => {
  const skills = await getSkills();
  res.json(skills);
});

app.get("/api/skills/:id", async (req, res) => {
  const id = req.params.id;
  const skill = await db.collection("skills").findOne({ _id: new ObjectId(id) });
  if (!skill) return res.status(404).json({ error: "Skill not found" });
  res.json(skill);
});

app.post("/api/skills", async (req, res) => {
  const newSkill = req.body;
  const result = await db.collection("skills").insertOne(newSkill);
  res.status(201).json({ _id: result.insertedId, ...newSkill });
});

app.put("/api/skills/:id", async (req, res) => {
  const id = req.params.id;
  const updatedData = req.body;
  const result = await db.collection("skills").updateOne({ _id: new ObjectId(id) }, { $set: updatedData });
  if (result.matchedCount === 0) return res.status(404).json({ error: "Skill not found" });
  res.json({ message: "Skill updated" });
});

app.delete("/api/skills/:id", async (req, res) => {
  const id = req.params.id;
  const result = await db.collection("skills").deleteOne({ _id: new ObjectId(id) });
  if (result.deletedCount === 0) return res.status(404).json({ error: "Skill not found" });
  res.json({ message: "Skill deleted" });
});

// START SERVER
app.listen(port, () => {
  console.log(`Listening on http://localhost:${port}`);
});

// DATABASE FUNCTIONS

// Get all menu links
async function getLinks() {
  let results = db.collection("menuLinks").find({});
  return await results.toArray();
}

// Get all projects
async function getProjects() {
  let results = db.collection("projects").find({});
  return await results.toArray();
}

// Get all skills
async function getSkills() {
  let results = db.collection("skills").find({});
  return await results.toArray();
}

// Add a new menu link
async function addLink(link) {
  await db.collection("menuLinks").insertOne(link);
  console.log("Link added successfully");
}

// Add a new project
async function addProject(link) {
  await db.collection("projects").insertOne(link);
  console.log("Project added successfully");
}

// Add a new skill
async function addSkill(link) {
  await db.collection("skills").insertOne(link);
  console.log("Skill added successfully");
}

// Delete menu link by ID
async function deleteLink(id) {
  let result = await db.collection("menuLinks").deleteOne({ _id: new ObjectId(String(id)) });
  if (result.deletedCount === 1) console.log("Link deleted successfully");
}

// Delete project by ID
async function deleteProject(id) {
  let result = await db.collection("projects").deleteOne({ _id: new ObjectId(String(id)) });
  if (result.deletedCount === 1) console.log("Project deleted successfully");
}

// Delete skill by ID
async function deleteSkill(id) {
  let result = await db.collection("skills").deleteOne({ _id: new ObjectId(String(id)) });
  if (result.deletedCount === 1) console.log("Skill deleted successfully");
}

// Update menu link
async function editLink(filter, link) {
  let status = await db.collection("menuLinks").updateOne(filter, { $set: link });
  console.log(status.modifiedCount === 1 ? "Link updated successfully" : "No changes were made to the link");
}

// Update project
async function editProject(filter, project) {
  let status = await db.collection("projects").updateOne(filter, { $set: link });
  console.log(status.modifiedCount === 1 ? "Project updated successfully" : "No changes were made to the project");
}

// Update skill
async function editSkill(filter, project) {
  let status = await db.collection("skills").updateOne(filter, { $set: link });
  console.log(status.modifiedCount === 1 ? "Skill updated successfully" : "No changes were made to skills");
}