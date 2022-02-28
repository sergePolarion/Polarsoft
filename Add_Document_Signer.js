/*
**	function:	Add  selected users from given Custom Fields as Signers
**				On Workflow Transition, Users listed in a LiveDoc custom field "redacteur" are added as signers for Electronic Signatures
** Written By:	  Serge Dubois , from Polarsoft :))
**
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

var outFile = new FileWriter("./logs/addSignatures.log");
var out = new BufferedWriter(outFile);


var theDoc = workflowContext.getTarget();
var trackerService = workflowContext.getTrackerService();
var IProjectService = trackerService.getProjectsService();
var iProject =  theDoc.getProject();
var ProjectId = iProject.getId();

// no signatures
var theTrackerProject= trackerService.getTrackerProject(IProjectService.getProject(ProjectId));
var statusEnum= theTrackerProject.getStatusEnum();
// set state requiring signatures, you can pass it as parameter
var toApprove= statusEnum.wrapOption("approved");

var wfsignmgr= theDoc.getWorkflowSignaturesManager();
var ret= wfsignmgr.addWorkflowSignature(toApprove);
theDoc.save();

var workflowSignatures = theDoc.getWorkflowSignatures();
out.write("Document " + theDoc.getId()); out.newLine(); out.flush();
out.write("Size workflowSignatures " + workflowSignatures.size()); out.newLine(); out.flush();

var minOne= workflowSignatures.size() - 1;
var workflowSignature = workflowSignatures.get(minOne);

var approvers=theDoc.getCustomField('redacteur');
out.write("Document approvers " + approvers ); out.newLine(); out.flush();
for (var i = 0; i < approvers.size(); i++)
{
	var app=approvers.get(i);

	var approverUser = IProjectService.getUser(app.getId());
	workflowSignature.addSignature(approverUser);

	}
}
