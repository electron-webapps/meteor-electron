serve = function(path, handler) {
  if (Package["iron:router"]){
    Package["iron:router"].Router.route(path, function(){
      handler(this.request, this.response, this.next);
    }, {where: "server"});
  } else if (Package["meteorhacks:picker"]){
    Package["meteorhacks:picker"].Picker.route(path, function(params, req, res, next){
      req.query = params.query;
      handler(req, res, next);
    });
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
  } else if (Package["meteorhacks:picker"]){
    Package["meteorhacks:picker"].Picker.route(dir + "/:stuff", function(params, req, res, next){
      req.query = params.query;
      handler(req, res, next);
    });
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
