var this is my new bugs ;
for (var i = 0; i < Theapprovers.size(); i++)
{
var app=Theapprovers.get(i);

var approverUser = IProjectService.getUser(app.getId());
workflowSignature.addSignature(approverUser);

}
//success;
