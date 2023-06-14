/*
**	function:	Add  desired selected users as Approver
**
** Written By:	Serge Dubois
**
** updated june 23: variabilization approver field
*/
var JavaPackages = new JavaImporter(java.io,
    java.text,
    java.lang,
    java.lang.io,
    java.lang.object,
    java.util,
    com.polarion.platform,
    com.polarion.platform.core,
    com.polarion.platform.context,
    com.polarion.platform.jobs);
with(JavaPackages) {

var SCRIPT_TITLE = "Scripting Debug Messages"
function log_debug(addTitle, msg) {
  com.polarion.core.util.logging.Logger.getLogger(SCRIPT_TITLE + " " + addTitle).info(msg);
}
var workitem = workflowContext.getWorkItem();
var trackerService = workflowContext.getTrackerService();
var IProjectService = trackerService.getProjectsService();
var  approverfield= "approvers";
var securityService = trackerService.getDataService().getSecurityService();
var currentUser = securityService.getCurrentUser();
var wiAuthor = workitem.getAuthor().getId();
var approvee=workitem.getCustomField( approverfield);

for (var i = 0; i < approvee.size(); i++)
 {
var app=approvee.get(i);
log_debug("app", app);
var approverUser = IProjectService.getUser(app.getId());
workitem.addAprovee(approverUser);
workitem.save();
}
}
