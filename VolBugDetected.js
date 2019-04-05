var this is my bug ;
for (var i = 0; i < approvers.size(); i++)
{
var app=approvers.get(i);

var approverUser = IProjectService.getUser(app.getId());
workflowSignature.addSignature(approverUser);

}
