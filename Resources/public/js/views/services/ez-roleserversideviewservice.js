/*
 * Copyright (C) eZ Systems AS. All rights reserved.
 * For full copyright and license information view LICENSE file distributed with this source code.
 */
YUI.add('ez-roleserversideviewservice', function (Y) {
    "use strict";
    /**
     * Provides the role server side view service class
     *
     * @method ez-roleserversideviewservice
     */
    Y.namespace('eZ');

    /**
     * The Role Server Side View Service class.
     *
     * @namespace eZ
     * @class RoleServerSideViewService
     * @constructor
     * @extends eZ.ServerSideViewService
     */
    Y.eZ.RoleServerSideViewService = Y.Base.create('roleServerSideViewService', Y.eZ.ServerSideViewService, [], {
        initializer: function () {
            this.on('*:contentDiscover', function (e) {
                e.config.contentDiscoveredHandler = Y.bind(this._assignRole, this);
            });
        },

        /**
         * Assign the role to the Content items after the user has chosen them in
         * the universal discovery widget
         *
         * @method _assignRole
         * @protected
         * @param {EventFacade} e
         */
        _assignRole: function (e) {
            var data = e.target.get('data'),
                userService = this.get('capi').getUserService(),
                discoveryService = this.get('capi').getDiscoveryService(),
                service = this;

            this._assignRoleNotificationStarted(
                data.roleId, data.roleName, e.selection
            );

            userService.loadRole(data.roleId, function (error, response) {
                var role,
                    tasks = new Y.Parallel(),
                    end = tasks.add(function (err, response) {
                        if (err) {
                            service._error('tasks.add() failed: ' + err.message);
                            return;
                        }

                        console.log('end'); // TODO just to let us know that it was picked, error handling should be here
                    });

                if (error) {
                    service._error('loadRole failed: ' + error.message);
                    return;
                }

                role = response.document.Role;

                Y.Array.each(e.selection, function (struct) {
                    // TODO assign with limitation
                    var limitation = null;
                    //var limitation = { // DUMMY SECTION DATA
                    //    "_identifier": "Section",
                    //    "values": {
                    //        "ref": [{
                    //            "_href": "/api/ezp/v2/content/sections/1",
                    //            "_media-type": "application/vnd.ez.api.Section+json"
                    //        }, {
                    //            "_href": "/api/ezp/v2/content/sections/4",
                    //            "_media-type": "application/vnd.ez.api.Section+json"
                    //        }]
                    //    }
                    //};
                    //var limitation = { // DUMMY SUBTREE DATA
                    //    "_identifier": "Subtree",
                    //    "values": {
                    //        "ref": [{
                    //            "_href": "/api/ezp/v2/content/locations/1/5/14",
                    //            "_media-type": "application/vnd.ez.api.Location+json"
                    //        }]
                    //    }
                    //};

                    // Convert hrefs to IDs, required by API
                    if (limitation) {
                        for ( var i = 0; i < limitation.values.ref.length; i++ ) {
                            if (limitation._identifier == "Section") {
                                limitation.values.ref[i]._href = /\d+$/.exec(limitation.values.ref[i]._href)[0];
                            } else if (limitation._identifier == "Subtree") {
                                limitation.values.ref[i]._href = /(\/\d+)+$/.exec(limitation.values.ref[i]._href)[0];
                            }
                        }
                    }

                    var roleAssignInputStruct = userService.newRoleAssignInputStruct(role, limitation),
                        contentTypeIdentifier = struct.contentType.get('identifier');

                    if (contentTypeIdentifier === 'user') {
                        discoveryService.getInfoObject('users', function (error, usersInfoObject) {
                            if (error) {
                                service._error('getInfoObject for "users" failed: ' + error.message);
                                return;
                            }

                            // We need a user ID, e.g.: /api/ezp/v2/user/users/10
                            var userIdStr = usersInfoObject._href + '/' + struct.content.get('contentId');

                            userService.assignRoleToUser(
                                userIdStr, roleAssignInputStruct, end
                            );
                        });
                    } else if (contentTypeIdentifier === 'user_group') {
                        discoveryService.getInfoObject('rootUserGroup', function (error, rootUserGroup) {
                            if (error) {
                                service._error('getInfoObject for "rootUserGroup" failed: ' + error.message);
                                return;
                            }

                            /* We need to convert content ID to user group ID, e.g.
                               change this: /api/ezp/v2/content/locations/1/5/14
                               into this: /api/ezp/v2/user/groups/1/5/14
                             */
                            var location = struct.content.get('resources').MainLocation;
                            var groupIdStr = /.+user\/groups/.exec(rootUserGroup._href) + /(\/\d+)+$/g.exec(location)[0];

                            userService.assignRoleToUserGroup(
                                groupIdStr, roleAssignInputStruct, end
                            );
                        });
                    }
                });

                tasks.done(function () {
                    service._assignRoleCallback(data.roleId, data.roleName, e.selection,
                        Y.bind(data.afterUpdateCallback, service));
                });
            });
        },

        /**
         * Assign role callback triggering notification and calling given callback
         *
         * @method _assignRoleCallback
         * @protected
         * @param {String} roleId the role id
         * @param {String} roleName the role name
         * @param {Array} contents the array of Content items to which role is being assigned to
         * @param {Function} callback the callback to call when other tasks are done
         */
        _assignRoleCallback: function (roleId, roleName, contents, callback) {
            this._assignRoleNotificationDone(roleId, roleName, contents);
            callback();
        },

        /**
         * Notification changed to *started* before assigning role to Content items
         *
         * @method _assignRoleNotificationStarted
         * @protected
         * @param {String} roleId the role id
         * @param {String} roleName the role name
         * @param {Array} contents the array of Content items to which role is being assigned to
         */
        _assignRoleNotificationStarted: function (roleId, roleName, contents) {
            var notificationIdentifier = this._getAssignRoleNotificationIdentifier(
                    'assign-role', roleId, contents
                );

            this.fire('notify', {
                notification: {
                    identifier: notificationIdentifier,
                    text: 'Assigning the role "' + roleName + '" to ' + contents.length + ' Content items',
                    state: 'started',
                    timeout: 0
                },
            });
        },

        /**
         * Notification changed to *done* after assigning role to Content items
         *
         * @method _assignRoleNotificationDone
         * @protected
         * @param {String} roleId the role id
         * @param {String} roleName the role name
         * @param {Array} contents the array of Content items to which role is being assigned to
         */
        _assignRoleNotificationDone: function (roleId, roleName, contents) {
            var notificationIdentifier = this._getAssignRoleNotificationIdentifier(
                    'assign-role', roleId, contents
                );

            this.fire('notify', {
                notification: {
                    identifier: notificationIdentifier,
                    text: 'Role "' + roleName + '" assigned to ' + contents.length + ' Content items',
                    state: 'done',
                    timeout: 5
                },
            });
        },

        /**
         * Generates identifier for notifications which is unique basing on
         * role ID and IDs of Content items which role is being assigned to.
         *
         * @method _getAssignRoleNotificationIdentifier
         * @protected
         * @param {String} action custom string describing action which is being taken
         * @param {String} roleId the role id
         * @param {Array} contents the array of Content items to which role is being assigned to
         * @return {String} unique notification identifier based on passed parameters
         */
        _getAssignRoleNotificationIdentifier: function (action, roleId, contents) {
            var contentIds = [];

            Y.Array.each(contents, function (struct) {
                contentIds.push(struct.content.get('id'));
            });
            return action + '-' + roleId + '-' + contentIds.join('_');
        },
    });
});
