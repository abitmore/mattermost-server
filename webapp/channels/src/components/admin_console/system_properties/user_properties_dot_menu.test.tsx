// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fireEvent, screen, waitFor} from '@testing-library/react';
import React from 'react';
import type {ComponentProps} from 'react';

import type {UserPropertyField} from '@mattermost/types/properties';

import ModalController from 'components/modal_controller';

import {renderWithContext} from 'tests/react_testing_utils';

import DotMenu from './user_properties_dot_menu';

describe('UserPropertyDotMenu', () => {
    const baseField: UserPropertyField = {
        id: 'test-id',
        name: 'Test Field',
        type: 'text',
        group_id: 'custom_profile_attributes',
        create_at: 1736541716295,
        delete_at: 0,
        update_at: 0,
        attrs: {
            sort_order: 0,
            visibility: 'when_set',
            value_type: '',
        },
    };

    const updateField = jest.fn();
    const deleteField = jest.fn();
    const createField = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    const renderComponent = (field: UserPropertyField = baseField, dotMenuProps?: Partial<ComponentProps<typeof DotMenu>>) => {
        return renderWithContext(
            (
                <div>
                    <DotMenu
                        field={field}
                        canCreate={true}
                        {...dotMenuProps}
                        updateField={updateField}
                        deleteField={deleteField}
                        createField={createField}
                    />
                    <ModalController/>
                </div>
            ),
        );
    };

    it('renders dot menu button', () => {
        renderComponent();

        const menuButton = screen.getByTestId(`user-property-field_dotmenu-${baseField.id}`);
        expect(menuButton).toBeInTheDocument();
    });

    it('disables menu button when field is marked for deletion', () => {
        const deletedField = {
            ...baseField,
            delete_at: 123456789,
        };

        renderComponent(deletedField);

        const menuButton = screen.getByTestId(`user-property-field_dotmenu-${baseField.id}`);
        expect(menuButton).toBeDisabled();
    });

    it('shows correct visibility option based on field setting', async () => {
        renderComponent();

        // Open the menu
        const menuButton = screen.getByTestId(`user-property-field_dotmenu-${baseField.id}`);
        fireEvent.click(menuButton);

        // Verify the current visibility option is shown
        expect(screen.getByText('Hide when empty')).toBeInTheDocument();
    });

    it('updates visibility when selecting a different option', async () => {
        renderComponent();

        // Open the menu
        const menuButton = screen.getByTestId(`user-property-field_dotmenu-${baseField.id}`);
        fireEvent.click(menuButton);

        // Open the visibility submenu
        const visibilityMenuItem = screen.getByRole('menuitem', {name: /Visibility/});
        fireEvent.mouseOver(visibilityMenuItem);

        // Click "Always show" option
        const alwaysShowOption = screen.getByRole('menuitemradio', {name: /Always show/});
        fireEvent.click(alwaysShowOption);

        // Verify the field was updated with the new visibility
        expect(updateField).toHaveBeenCalledWith({
            ...baseField,
            attrs: {
                ...baseField.attrs,
                visibility: 'always',
            },
        });
    });

    it('displays LDAP and SAML link menu options for existing fields', async () => {
        renderComponent();

        // Open the menu
        const menuButton = screen.getByTestId(`user-property-field_dotmenu-${baseField.id}`);
        fireEvent.click(menuButton);

        // Verify both link options are shown
        expect(screen.getByText('Link attribute to AD/LDAP')).toBeInTheDocument();
        expect(screen.getByText('Link attribute to SAML')).toBeInTheDocument();
    });

    it('hides LDAP and SAML link menu options for pending fields', async () => {
        const pendingField = {
            ...baseField,
            create_at: 0, // Mark as pending creation
        };

        renderComponent(pendingField);

        // Open the menu
        const menuButton = screen.getByTestId(`user-property-field_dotmenu-${pendingField.id}`);
        fireEvent.click(menuButton);

        // Verify both link options are not shown
        expect(screen.queryByText('Link attribute to AD/LDAP')).not.toBeInTheDocument();
        expect(screen.queryByText('Link attribute to SAML')).not.toBeInTheDocument();
    });

    it('shows "Edit LDAP link" text when LDAP attribute is linked', async () => {
        const linkedField = {
            ...baseField,
            attrs: {
                ...baseField.attrs,
                ldap: 'employeeID',
            },
        };

        renderComponent(linkedField);

        // Open the menu
        const menuButton = screen.getByTestId(`user-property-field_dotmenu-${linkedField.id}`);
        fireEvent.click(menuButton);

        // Verify the LDAP link text shows the edit option
        expect(screen.getByText('Edit LDAP link')).toBeInTheDocument();
    });

    it('shows "Edit SAML link" text when SAML attribute is linked', async () => {
        const linkedField = {
            ...baseField,
            attrs: {
                ...baseField.attrs,
                saml: 'position',
            },
        };

        renderComponent(linkedField);

        // Open the menu
        const menuButton = screen.getByTestId(`user-property-field_dotmenu-${linkedField.id}`);
        fireEvent.click(menuButton);

        // Verify the SAML link text shows the edit option
        expect(screen.getByText('Edit SAML link')).toBeInTheDocument();
    });

    it('handles field duplication', async () => {
        renderComponent();

        // Open the menu
        const menuButton = screen.getByTestId(`user-property-field_dotmenu-${baseField.id}`);
        fireEvent.click(menuButton);

        // Click the duplicate option
        fireEvent.click(screen.getByText(/Duplicate attribute/));

        // Wait for createField to be called
        await waitFor(() => {
            // Verify createField was called with the correct parameters
            expect(createField).toHaveBeenCalledWith(expect.objectContaining({
                id: baseField.id,
                name: 'Test Field (copy)',
            }));
        });
    });

    it('hides field duplication when at field limit', async () => {
        renderComponent(undefined, {canCreate: false});

        // Open the menu
        const menuButton = screen.getByTestId(`user-property-field_dotmenu-${baseField.id}`);
        fireEvent.click(menuButton);

        // Verify duplicate option is not shown
        expect(screen.queryByText(/Duplicate attribute/)).not.toBeInTheDocument();
    });

    it('handles field deletion with confirmation when field exists in DB', async () => {
        renderComponent();

        // Open the menu
        const menuButton = screen.getByTestId(`user-property-field_dotmenu-${baseField.id}`);
        fireEvent.click(menuButton);

        // Click delete option
        const deleteOption = screen.getByRole('menuitem', {name: /Delete attribute/});
        fireEvent.click(deleteOption);

        await waitFor(() => {
            // Verify the delete modal is shown
            expect(screen.getByText('Delete Test Field attribute')).toBeInTheDocument();
        });

        // click delete confirm button
        const deleteConfirmButton = screen.getByRole('button', {name: /Delete/});
        fireEvent.click(deleteConfirmButton);

        await waitFor(() => {
            // Verify deleteField was called
            // promptDelete from the mock will resolve to true, triggering deleteField
            expect(deleteField).toHaveBeenCalledWith(baseField.id);
        });
    });

    it('skips confirmation when deleting a newly created field', async () => {
        const pendingField = {
            ...baseField,
            create_at: 0, // Mark as pending creation
        };

        renderComponent(pendingField);

        // Open the menu
        const menuButton = screen.getByTestId(`user-property-field_dotmenu-${pendingField.id}`);
        fireEvent.click(menuButton);

        // Click delete option
        const deleteOption = screen.getByRole('menuitem', {name: /Delete attribute/});
        fireEvent.click(deleteOption);

        await waitFor(() => {
            // Verify deleteField was called
            expect(deleteField).toHaveBeenCalledWith(pendingField.id);
        });
    });
});
