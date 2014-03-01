var app = app || {};
var ENTER_KEY = 13;
var socket = io.connect('http://' + location.hostname + ':8080');

app.conf = {};
app.conf.username = undefined;
app.conf.touser = 'all';

(function($) {
    //
    'use strict';

    app.ViewBox = Backbone.View.extend({
        el : '#chatBox',
        events : {
            'click #savename' : 'regName',
            'keyup #pubText' : 'pubText',
            'click #publish' : 'publish',
            'click .chatListBox li' : 'changeTar'
        },
        initialize : function() {
            var that = this;
            this.$input = this.$('#pubText');
            this.$all = this.$('.chatGroup li');
            this.listenTo(app.coll_users, 'add', this.renderUserOne);
            this.listenTo(app.chatMsg, 'add', this.newMsg);
            this.usename = undefined;

            socket.on('regback', this.regCheck);
            socket.on('receive', this.receive);
            socket.on('newuser', this.newUser);
            socket.on('getUser', _showUser);
            socket.on('deleteUser', _delUser);

            function _showUser(data) {
                console.log('showUser', data)
                that.showUser(data);
            }

            function _delUser(data) {
                console.log('deleteUser', data)
                that.delUser(data);
            }


            $('#login').modal();
            var that = this;
            $('#login').find('#savename').off().on('click', function() {
                that.regName();
            });
            
            $('#username').on('keyup',_inputName);
            function _inputName(e){
                that.inputName(e);
            }
            
            
        },
        changeTar : function(data) {
            var that = $(data.target);
            if (that.attr('username') != app.conf.username) {
                app.conf.touser = that.attr('username') || 'all';
                this.$('.chatListBox li').removeClass('active');
                that.addClass('active').removeClass('unread');
                this.$('.chatMain').html('');
                this.readerTo(app.conf.touser);
                $('.chatBox title').html('CURRENT: ' + app.conf.touser);
            } else {
                this.$('.chatMain').html('<div>hum~ <br/> You want talk to yourself? <br/> that\'s sounds a little strange! <br/> <span style="color:red; font-weight:bold;">Try to talk with OTHERS~</span></div>')
            }
        },
        readerTo : function(user) {
            var msg = app.chatMsg.toUser(user);
            for (var i = 0, len = msg.length; i < len; i++) {
                this.renderMsgOne(msg[i])
            }
        },
        delUser : function(data) {
            var mod = app.coll_users.findWhere({
                name : data.username
            });
            app.coll_users.remove(mod);
        },
        showUser : function(data) {
            for (var i = 0, len = data.length; i < len; i++) {
                this.newUser({
                    username : data[i]
                });
            };
        },
        newUser : function(data) {
            app.coll_users.add({
                name : data.username
            });
        },
        pubText : function(e) {
            var key = e.keyCode;
            if (key == ENTER_KEY) {
                if (app.conf.username) {
                    this.pubtext();
                } else {
                    $('#login').modal();
                    var that = this;
                    $('#login').find('#savename').off('click').on('click', function() {
                        that.regName();
                    })
                }
            }
        },
        publish : function() {
            if (app.conf.username != undefined) {
                this.pubtext();
            } else {
                $('#login').modal();
                var that = this;
                $('#login').find('#savename').off().on('click', function() {
                    that.regName();
                })
            }
        },
        pubtext : function() {
            console.log(app.conf.touser);
            socket.emit('publish', {
                username : app.conf.username,
                touser : app.conf.touser,
                text : this.$input.val()
            });
            this.$input.val('');
            this.$input.focus();
        },
        inputName : function(e) {
            var key = e.keyCode;
            if (key == ENTER_KEY) {
                this.regName();
            }
        },
        regName : function() {
            var $username = $('#login').find('#username');
            var val = $username.val();
            if (val) {
                socket.emit('reg', {
                    'username' : val
                });
            }
        },
        regCheck : function(data) {
            if (data.sta == 1) {
                $('#login').modal('hide');
                app.conf.username = data.name;
                socket.emit('getUsersList');
                // app.coll_users.add({
                // name : app.conf.username
                // });
            } else {
                alert(data.msg);
            }
        },
        receive : function(data) {
            app.chatMsg.add(data);
            //console.log('receive', data);
        },
        readerAll : function() {
            this.$all.html('All (' + app.coll_users.length + ')')
        },
        renderUserOne : function(model) {
            this.useView = new app.ViewUList({
                model : model
            });
            this.$('ul.chatList').append(this.useView.render().$el);
            this.readerAll();
        },
        newMsg : function(model) {
            if ((model.toJSON().poster !== app.conf.touser) && (model.toJSON().poster !== app.conf.username) && (model.toJSON().poster !== 'all')) {
                $('.chatListBox li[username="' + model.toJSON().poster + '"]').addClass('unread');
            }
            this.renderMsgOne(model);
        },
        renderMsgOne : function(model) {
            //if (true || model.toJSON().poster == app.conf.touser || model.toJSON().poster == app.conf.username || (model.toJSON().poster == app.conf.touser && app.conf.touser == 'all')) {
            var isAll = (app.conf.touser == 'all') && (model.toJSON().touser == 'all');
            var isPoster = (model.toJSON().poster == app.conf.username) && (model.toJSON().touser == app.conf.touser);
            var isRecerver = (model.toJSON().poster == app.conf.touser) && (model.toJSON().touser == app.conf.username);

            if (isAll || isPoster || isRecerver) {
                this.msgView = new app.ViewChat({
                    model : model
                });
                this.$('.chatMain').append(this.msgView.reader().$el);
                $('.chatMain').scrollTop($('.chatMain')[0].scrollHeight);
            }
        }
    });

    //view for chat
    app.ViewUList = Backbone.View.extend({
        tagName : 'li',
        template : _.template('<span>unread</span><%- name %>'),
        initialize : function() {
            this.listenTo(this.model, 'remove', this.remove);
            //this.listenTo(this.model, 'change', this.change);
        },
        render : function() {
            var json = this.model.toJSON();
            var html = this.template(json);
            this.$el.attr('username', json.name);
            if (app.conf.username == json.name) {
                this.$el.addClass('disabled')
            }
            this.$el.html(html);
            return this;
        },
        // change : function() {
        // if (this.model.toJSON().unread) {
        // this.$el.addClass('unread');
        // } else {
        // this.$el.removeClass('unread');
        // }
        // },
        remove : function() {
            this.$el.remove();
        }
    });

    //view for chat
    app.ViewChat = Backbone.View.extend({
        template : _.template('<div class="chatbox <%= app.conf.username==poster ? "chat_other" : "chat_mine"  %> "><div class="icon"><%- poster %></div><div class="text"><%- text %></div></div>'),
        reader : function() {
            var json = this.model.toJSON();
            var html = this.template(json);
            this.$el.html(html);
            return this;
        }
    });

    //user
    app.ModelUser = Backbone.Model.extend({
        defaults : {
            name : undefined,
            unread : 0
        }
    });
    app.users = Backbone.Collection.extend({
        model : app.ModelUser
    });
    app.coll_users = new app.users();

    //chat
    app.ModelChat = Backbone.Model.extend({
        defaults : {
            poster : undefined,
            touser : 'all',
            text : undefined
        }
    });
    app.chats = Backbone.Collection.extend({
        model : app.ModelChat,
        toUser : function(username) {
            var username = username || 'all';
            return this.filter(function(list) {
                return list.get('touser') == username || list.get('poster') == username;
            });
        }
    })
    app.chatMsg = new app.chats();

    new app.ViewBox();

})($);

