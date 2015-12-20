serve = function(path, handler) {
  if (Package["iron:router"]){
    Package["iron:router"].Router.route(path, function(){
      handler(this.request, this.response, this.next);
    }, {where: "server"});
  } else {
    WebApp.rawConnectHandlers.use(function(req, res, next){
      if (req.path === path) {
        handler(req, res, next);
      } else {
        next();
      }
    });
  }
};

serveDir = function(dir, handler){
  //path starts with dir
  if (Package["iron:router"]){
    Package["iron:router"].Router.route(dir + "/:stuff", function(){
      handler(this.request, this.response, this.next);
    }, {where: "server"});
  } else {
    var regex = new RegExp("^" + dir);
    WebApp.rawConnectHandlers.use(function(req, res, next){
      if (regex.test(req.path)) {
        handler(req, res, next);
      } else {
        next();
      }
    });
  }
};
