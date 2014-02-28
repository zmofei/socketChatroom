var app = app || {};
var ENTER_KEY = 13;
var socket = io.connect('http://10.21.132.44:8080');

app.conf = {};
app.conf.username = undefined;
app.conf.touser = 'all';

(function($) {
    //
    'use strict';

    app.ViewBox = Backbone.View.extend({
        el : '#chatBox',
        events : {
            'keyup #username' : 'inputName',
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
            this.listenTo(app.chatMsg, 'add', this.renderMsgOne);
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
            })
        },
        changeTar : function(data) {
            var that = $(data.target);
            this.$('.chatListBox li').removeClass('active');
            app.conf.touser = that.attr('username')||'all';
            that.addClass('active');
            this.$('.chatMain').html('');
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
            socket.emit('publish', {
                username : app.conf.username,
                touser : app.conf.touser,
                text : this.$input.val()
            })
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
        renderMsgOne : function(model) {
            if(model.toJSON().poster==app.conf.touser || app.conf.touser=='all'){
                this.msgView = new app.ViewChat({
                    model : model
                });
                this.$('.chatMain').append(this.msgView.reader().$el);
            }
        }
    });

    //view for chat
    app.ViewUList = Backbone.View.extend({
        tagName : 'li',
        template : _.template('<%- name %>'),
        initialize : function() {
            this.listenTo(this.model, 'remove', this.remove);
        },
        render : function() {
            var json = this.model.toJSON();
            var html = this.template(json);
            this.$el.attr('username', json.name)
            this.$el.html(html);
            return this;
        },
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
                return list.get('touser') == username;
            });
        }
    })
    app.chatMsg = new app.chats();

    new app.ViewBox();

})($);

